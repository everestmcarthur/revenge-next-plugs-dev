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
            RingConfig.diag("$MESSAGE_VIEW_CLASS not found")
            return
        }

        try {
            val allMethods = messageViewClass.declaredMethods
            val configureAuthorMethods = allMethods.filter { it.name == "configureAuthor" }
            if (configureAuthorMethods.isEmpty()) {
                RingConfig.diag("configureAuthor not found on $MESSAGE_VIEW_CLASS")
                return
            }

            for (method in configureAuthorMethods) {
                val unhook = XposedBridge.hookMethod(method, object : XC_MethodHook() {
                    override fun afterHookedMethod(param: MethodHookParam) {
                        if (!RingConfig.enabled) return
                        val view = param.thisObject as? ViewGroup ?: return
                        applyRing(view)
                    }
                })
                hooks.add(unhook)
            }

            RingConfig.hooksInstalled = true
            RingConfig.diag("installed ${configureAuthorMethods.size} hook(s)")
        } catch (e: Throwable) {
            RingConfig.diag("install failed: $e")
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

    private fun findAvatarView(view: ViewGroup): ImageView? {
        val binding = callOrNull(view, "getBinding") ?: fieldOrNull(view, "binding")
        val fromBinding = binding?.let { fieldOrNull(it, "authorAvatar") } as? ImageView
        if (fromBinding != null) return fromBinding
        return view.firstChildOrNull { it is ImageView } as? ImageView
    }

    private fun applyRing(view: ViewGroup) {
        try {
            val avatarView = findAvatarView(view)
            if (avatarView == null) {
                RingConfig.diag(
                    "no avatar ImageView found, children: " +
                        (0 until view.childCount).joinToString { view.getChildAt(it).javaClass.simpleName },
                )
                return
            }

            val userId = findAuthorId(view)
            if (userId == null) {
                RingConfig.diag("no author id resolved")
                return
            }
            styledViews[view] = userId

            val status = RingConfig.presenceCache[userId]
            if (status == null) {
                RingConfig.diag("no cached presence for $userId (cache size ${RingConfig.presenceCache.size})")
                return
            }
            val color = RingConfig.statusColors[status]
            if (color == null) {
                RingConfig.diag("no color configured for status '$status'")
                return
            }

            avatarView.foreground = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.TRANSPARENT)
                setStroke(RingConfig.ringThickness, color)
            }

            RingConfig.diag("ring applied for $userId ($status)")
            hidePresenceIndicator(view)
        } catch (e: Throwable) {
            RingConfig.diag("applyRing failed: $e")
        }
    }

    private fun findAuthorId(view: ViewGroup): String? {
        val messageId = fieldOrNull(view, "messageId")?.toString()
        if (messageId != null) {
            val cached = RingConfig.messageAuthors[messageId]
            if (cached != null) return cached
        }

        val binding = fieldOrNull(view, "binding")
        if (binding != null) {
            for (getter in MESSAGE_GETTERS) {
                val message = callOrNull(binding, getter) ?: continue
                val authorId = extractAuthorId(message)
                if (authorId != null) return authorId
            }
        }

        var currentClass: Class<*>? = view.javaClass
        while (currentClass != null) {
            for (field in currentClass.declaredFields) {
                field.isAccessible = true
                val value = try {
                    field.get(view)
                } catch (e: Throwable) {
                    null
                } ?: continue

                val viaMessage = extractAuthorId(value)
                if (viaMessage != null) {
                    RingConfig.diag("resolved author id via field '${field.name}' -> author/user")
                    return viaMessage
                }

                if (value !is View) {
                    val directId = callOrNull(value, "getId")
                    if (isSnowflakeLike(directId)) {
                        RingConfig.diag("resolved author id via field '${field.name}' -> direct getId")
                        return directId.toString()
                    }
                }
            }
            currentClass = currentClass.superclass
        }

        RingConfig.diag(
            "couldn't resolve author id, messageId=$messageId (known authors: ${RingConfig.messageAuthors.size})",
        )
        return null
    }

    private fun extractAuthorId(message: Any): String? {
        for (getter in AUTHOR_GETTERS) {
            val author = callOrNull(message, getter) ?: continue
            val id = callOrNull(author, "getId")
            if (isSnowflakeLike(id)) return id.toString()
        }
        return null
    }

    private fun isSnowflakeLike(value: Any?): Boolean {
        val text = value?.toString() ?: return false
        val number = text.toLongOrNull() ?: return false
        return number > Int.MAX_VALUE
    }

    private fun callOrNull(target: Any, method: String): Any? =
        try {
            XposedHelpers.callMethod(target, method)
        } catch (e: Throwable) {
            null
        }

    private fun fieldOrNull(target: Any, name: String): Any? =
        try {
            XposedHelpers.getObjectField(target, name)
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
