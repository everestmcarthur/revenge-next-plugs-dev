@file:JvmName("ThemeMasterPlugin")

package dev.everestmcarthur.thememaster

import io.github.revenge.plugins.plugin
import io.github.revenge.xposed.api.registerNativeMethod

val themeMasterPlugin = plugin {
	start {
		log.i("Theme Master native shell starting")

		registerNativeMethod("thememaster.ping") {
			mapOf("ok" to true)
		}
	}

	stop {
		log.i("Theme Master native shell stopping")
	}
}
