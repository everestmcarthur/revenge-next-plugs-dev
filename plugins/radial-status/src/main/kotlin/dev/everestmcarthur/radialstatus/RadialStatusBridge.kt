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
            RingConfig.diag("configure: enabled=$enabled thickness=$thickness colors=${RingConfig.statusColors.keys}")
            null
        }

        scope.registerNativeMethod("radialstatus.setPresence") { args ->
            val userId = args.getOrNull(0) as? String
            val status = args.getOrNull(1) as? String
            if (userId != null && status != null) {
                RingConfig.presenceCache[userId] = status
                AvatarRingHooks.reapplyForUser(userId)
            } else {
                RingConfig.diag("setPresence got bad args: $args")
            }
            null
        }

        scope.registerNativeMethod("radialstatus.setMessageAuthor") { args ->
            val messageId = args.getOrNull(0) as? String
            val authorId = args.getOrNull(1) as? String
            if (messageId != null && authorId != null) {
                RingConfig.messageAuthors[messageId] = authorId
            }
            null
        }

        scope.registerNativeMethod("radialstatus.debug") {
            mapOf(
                "hooksInstalled" to RingConfig.hooksInstalled,
                "enabled" to RingConfig.enabled,
                "ringThickness" to RingConfig.ringThickness,
                "statusColors" to RingConfig.statusColors.keys.toList(),
                "presenceCacheSize" to RingConfig.presenceCache.size,
                "messageAuthorsSize" to RingConfig.messageAuthors.size,
                "diagnostics" to RingConfig.diagnosticsSnapshot(),
            )
        }
    }
}
