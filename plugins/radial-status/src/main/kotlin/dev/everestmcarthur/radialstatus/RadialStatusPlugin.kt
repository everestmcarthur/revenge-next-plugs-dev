@file:JvmName("RadialStatusPlugin")

package dev.everestmcarthur.radialstatus

import io.github.revenge.plugins.plugin

val radialStatusApiPlugin = plugin {
    start {
        AvatarRingHooks.install(classLoader)
        RadialStatusBridge.register(this)
    }

    stop {
        AvatarRingHooks.uninstall()
    }
}
