package dev.everestmcarthur.radialstatus

import de.robv.android.xposed.XposedBridge
import java.util.Collections

internal object RingConfig {
    var enabled = false
    var ringThickness = 2.px
    val statusColors: MutableMap<String, Int> = Collections.synchronizedMap(mutableMapOf())
    val presenceCache: MutableMap<String, String> = Collections.synchronizedMap(mutableMapOf())
    val messageAuthors: MutableMap<String, String> = Collections.synchronizedMap(mutableMapOf())

    var hooksInstalled = false

    private const val MAX_DIAGNOSTICS = 200
    private val diagnostics: MutableList<String> = Collections.synchronizedList(mutableListOf())

    fun diag(message: String) {
        XposedBridge.log("[RadialStatus] $message")
        synchronized(diagnostics) {
            diagnostics.add(message)
            while (diagnostics.size > MAX_DIAGNOSTICS) diagnostics.removeAt(0)
        }
    }

    fun diagnosticsSnapshot(): List<String> = synchronized(diagnostics) { diagnostics.toList() }
}
