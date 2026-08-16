@file:JvmName("RadialStatusPlugin")

package dev.everestmcarthur.radialstatus

import io.github.revenge.plugins.plugin

val radialStatusApiPlugin = plugin {
    start {
        RingConfig.diag("native plugin starting")
        AvatarRingHooks.install(classLoader)
        RadialStatusBridge.register(this, classLoader)
    }

    stop {
        RingConfig.diag("native plugin stopping")
        AvatarRingHooks.uninstall()
    }
}
