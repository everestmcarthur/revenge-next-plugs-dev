package dev.everestmcarthur.radialstatus

internal object ClassScanner {
    fun findClasses(classLoader: ClassLoader, keyword: String, limit: Int = 200): List<String> {
        val pathListField = classLoader.javaClass.superclass
            ?.getDeclaredField("pathList")
            ?.apply { isAccessible = true }
            ?: return emptyList()
        val pathList = pathListField.get(classLoader) ?: return emptyList()

        val dexElementsField = pathList.javaClass.getDeclaredField("dexElements").apply { isAccessible = true }
        val dexElements = dexElementsField.get(pathList) as Array<*>

        val needle = keyword.lowercase()
        val matches = mutableListOf<String>()

        for (element in dexElements) {
            if (element == null) continue
            val dexFileField = element.javaClass.getDeclaredField("dexFile").apply { isAccessible = true }
            val dexFile = dexFileField.get(element) ?: continue
            val entries = dexFile.javaClass.getMethod("entries").invoke(dexFile) as java.util.Enumeration<*>
            while (entries.hasMoreElements()) {
                val name = entries.nextElement() as? String ?: continue
                if (name.lowercase().contains(needle)) {
                    matches.add(name)
                    if (matches.size >= limit) return matches
                }
            }
        }
        return matches
    }
}
