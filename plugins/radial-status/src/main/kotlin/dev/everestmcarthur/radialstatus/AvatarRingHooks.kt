package dev.everestmcarthur.radialstatus

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import de.robv.android.xposed.XposedHelpers
import java.util.Collections
import java.util.WeakHashMap

internal object AvatarRingHooks {
    private const val MESSAGE_VIEW_CLASS = "com.discord.chat.presentation.message.MessageView"
    private val MESSAGE_GETTERS = listOf("getMessage", "getMessageEntry", "getData")
    private val AUTHOR_GETTERS = listOf("getAuthor", "getUser")
    private val styledViews: MutableMap<ViewGroup, String> =
        Collections.synchronizedMap(WeakHashMap())
    private val hooks: MutableList<XC_MethodHook.Unhook> = mutableListOf()

    fun install(classLoader: ClassLoader) {
        if (RingConfig.hooksInstalled) return

        val messageViewClass = XposedHelpers.findClassIfExists(MESSAGE_VIEW_CLASS, classLoader)
        if (messageViewClass == null) {
            XposedBridge.log("[RadialStatus] $MESSAGE_VIEW_CLASS not found")
            return
        }

        try {
            val allMethods = messageViewClass.declaredMethods
            XposedBridge.log(
                "[RadialStatus] $MESSAGE_VIEW_CLASS methods: " + allMethods.joinToString { it.name },
            )

            val configureAuthorMethods = allMethods.filter { it.name == "configureAuthor" }
            if (configureAuthorMethods.isEmpty()) {
                XposedBridge.log("[RadialStatus] configureAuthor not found on $MESSAGE_VIEW_CLASS")
                return
            }

            for (method in configureAuthorMethods) {
                val unhook = XposedBridge.hookMethod(method, object : XC_MethodHook() {
                    override fun afterHookedMethod(param: MethodHookParam) {
                        XposedBridge.log("[RadialStatus] configureAuthor fired, enabled=${RingConfig.enabled}")
                        if (!RingConfig.enabled) return
                        val view = param.thisObject as? ViewGroup
                        if (view == null) {
                            XposedBridge.log("[RadialStatus] thisObject is not a ViewGroup: ${param.thisObject?.javaClass}")
                            return
                        }
                        applyRing(view)
                    }
                })
                hooks.add(unhook)
            }

            RingConfig.hooksInstalled = true
            XposedBridge.log("[RadialStatus] installed ${configureAuthorMethods.size} hook(s)")
        } catch (e: Throwable) {
            XposedBridge.log("[RadialStatus] install failed: $e")
        }
    }

    fun uninstall() {
        for (hook in hooks) hook.unhook()
        hooks.clear()
        RingConfig.hooksInstalled = false
        RingConfig.enabled = false
        styledViews.clear()
    }

    fun reapplyForUser(userId: String) {
        val views = synchronized(styledViews) { styledViews.filterValues { it == userId }.keys.toList() }
        for (view in views) {
            if (view.isAttachedToWindow) applyRing(view) else styledViews.remove(view)
        }
    }

    private fun applyRing(view: ViewGroup) {
        try {
            val avatarView = view.firstChildOrNull { it is ImageView } as? ImageView
            if (avatarView == null) {
                XposedBridge.log(
                    "[RadialStatus] no ImageView child, children: " +
                        (0 until view.childCount).joinToString { view.getChildAt(it).javaClass.simpleName },
                )
                return
            }

            val userId = findAuthorId(view)
            if (userId == null) {
                XposedBridge.log("[RadialStatus] no author id resolved")
                return
            }
            styledViews[view] = userId

            val status = RingConfig.presenceCache[userId]
            if (status == null) {
                XposedBridge.log("[RadialStatus] no cached presence for $userId (cache size ${RingConfig.presenceCache.size})")
                return
            }
            val color = RingConfig.statusColors[status]
            if (color == null) {
                XposedBridge.log("[RadialStatus] no color configured for status '$status'")
                return
            }

            avatarView.foreground = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.TRANSPARENT)
                setStroke(RingConfig.ringThickness, color)
            }

            XposedBridge.log("[RadialStatus] ring applied for $userId ($status)")
            hidePresenceIndicator(view)
        } catch (e: Throwable) {
            XposedBridge.log("[RadialStatus] applyRing failed: $e")
        }
    }

    private fun findAuthorId(view: ViewGroup): String? {
        val binding = try {
            XposedHelpers.getObjectField(view, "binding")
        } catch (e: Throwable) {
            XposedBridge.log("[RadialStatus] no 'binding' field on MessageView: ${e.message}")
            return null
        }

        for (getter in MESSAGE_GETTERS) {
            val message = callOrNull(binding, getter) ?: continue
            val authorId = extractAuthorId(message)
            if (authorId != null) return authorId
        }

        XposedBridge.log(
            "[RadialStatus] couldn't resolve author id, binding fields: " +
                binding.javaClass.declaredFields.joinToString { it.name },
        )
        return null
    }

    private fun extractAuthorId(message: Any): String? {
        for (getter in AUTHOR_GETTERS) {
            val author = callOrNull(message, getter) ?: continue
            val id = callOrNull(author, "getId")
            if (id != null) return id.toString()
        }
        return null
    }

    private fun callOrNull(target: Any, method: String): Any? =
        try {
            XposedHelpers.callMethod(target, method)
        } catch (e: Throwable) {
            null
        }

    private fun hidePresenceIndicator(view: ViewGroup) {
        for (i in 0 until view.childCount) {
            val child = view.getChildAt(i)
            val name = child.javaClass.simpleName
            if (name.contains("Presence", ignoreCase = true) || name.contains("StatusIndicator", ignoreCase = true)) {
                child.visibility = View.GONE
            }
        }
    }
}
