package dev.everestmcarthur.radialstatus

import android.content.res.Resources
import android.view.View
import android.view.ViewGroup

internal val Int.px: Int
    get() = (this * Resources.getSystem().displayMetrics.density).toInt()

internal fun ViewGroup.firstChildOrNull(predicate: (View) -> Boolean): View? {
    for (i in 0 until childCount) {
        val child = getChildAt(i)
        if (predicate(child)) return child
    }
    return null
}
