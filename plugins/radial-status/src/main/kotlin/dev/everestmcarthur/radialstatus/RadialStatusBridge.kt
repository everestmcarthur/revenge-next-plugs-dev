package dev.everestmcarthur.radialstatus

import io.github.revenge.plugins.PluginScope
import io.github.revenge.xposed.api.registerNativeMethod

internal object RadialStatusBridge {
    fun register(scope: PluginScope) {
        scope.registerNativeMethod("radialstatus.configure") { args ->
            val enabled = args.getOrNull(0) as? Boolean ?: false
            val thickness = (args.getOrNull(1) as? Number)?.toInt() ?: 2
            val colors = args.getOrNull(2) as? Map<*, *> ?: emptyMap<Any?, Any?>()

            RingConfig.enabled = enabled
            RingConfig.ringThickness = thickness.px
            RingConfig.statusColors.clear()
            for ((status, colorText) in colors) {
                val key = status as? String ?: continue
                val value = (colorText as? String)?.toLongOrNull() ?: continue
                RingConfig.statusColors[key] = value.toInt()
            }
            null
        }

        scope.registerNativeMethod("radialstatus.setPresence") { args ->
            val userId = args.getOrNull(0) as? String
            val status = args.getOrNull(1) as? String
            if (userId != null && status != null) {
                RingConfig.presenceCache[userId] = status
                AvatarRingHooks.reapplyForUser(userId)
            }
            null
        }
    }
}
