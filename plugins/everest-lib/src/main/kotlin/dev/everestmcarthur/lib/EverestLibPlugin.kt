@file:JvmName("EverestLibPlugin")

package dev.everestmcarthur.lib

import io.github.revenge.plugins.plugin

val everestLibPlugin = plugin {
    start {
        // Shared Everest native hooks and helpers initialization
    }
    stop {
        // Cleanup hooks if any
    }
}
