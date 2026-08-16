package dev.everestmcarthur.radialstatus

import de.robv.android.xposed.XC_MethodHook
import java.util.Collections

internal object RingConfig {
    var enabled = false
    var ringThickness = 2.px
    val statusColors: MutableMap<String, Int> = Collections.synchronizedMap(mutableMapOf())
    val presenceCache: MutableMap<String, String> = Collections.synchronizedMap(mutableMapOf())

    var hooksInstalled = false
    var configureAuthorHook: XC_MethodHook.Unhook? = null
}
