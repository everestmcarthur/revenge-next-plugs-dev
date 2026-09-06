package dev.everestmcarthur.lib

import android.content.res.Resources
import android.view.View
import android.view.ViewGroup

val Int.px: Int
    get() = (this * Resources.getSystem().displayMetrics.density).toInt()

val Float.px: Float
    get() = this * Resources.getSystem().displayMetrics.density

fun ViewGroup.firstChildOrNull(predicate: (View) -> Boolean): View? {
    for (i in 0 until childCount) {
        val child = getChildAt(i)
        if (predicate(child)) return child
    }
    return null
}

fun ViewGroup.hasChild(predicate: (View) -> Boolean): Boolean {
    for (i in 0 until childCount) {
        if (predicate(getChildAt(i))) return true
    }
    return false
}
