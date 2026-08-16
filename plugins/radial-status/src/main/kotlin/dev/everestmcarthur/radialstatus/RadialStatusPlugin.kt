@file:JvmName("RadialStatusPlugin")

package dev.everestmcarthur.radialstatus

import de.robv.android.xposed.XposedBridge
import io.github.revenge.plugins.plugin

val radialStatusApiPlugin = plugin {
    start {
        XposedBridge.log("[RadialStatus] native plugin starting")
        AvatarRingHooks.install(classLoader)
        RadialStatusBridge.register(this)
    }

    stop {
        XposedBridge.log("[RadialStatus] native plugin stopping")
        AvatarRingHooks.uninstall()
    }
}
