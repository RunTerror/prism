package dev.prism.android

import org.json.JSONObject

/**
 * The app's brand (DESIGN-SYSTEM.md section 3): one accent colour, and optionally the chat's own
 * background and text colours, as ARGB ints (e.g. `0xFFFF6A00.toInt()`). `...Dark` values are for
 * dark mode; when missing, Prism works them out from the light ones. Set it with [Prism.theme].
 */
data class PrismTheme(
    val accent: Int,
    /** "rounded" (default), "square" or "pill": the corner style of cards, buttons and fields. */
    val corners: String = "rounded",
    /** Your font's names per weight, as Valdi finds them in the app's fonts. Missing weights use the system font. */
    val font: Font? = null,
    val accentDark: Int? = null,
    val background: Int? = null,
    val backgroundDark: Int? = null,
    val text: Int? = null,
    val textDark: Int? = null,
) {
    /** What the widget reads (prism_theme Brand), with colours as "#RRGGBB". */
    internal val json: String
        get() {
            val o = JSONObject()
            o.put("accent", hex(accent))
            o.put("corners", corners)
            font?.let { f ->
                val fo = JSONObject()
                f.regular?.let { fo.put("regular", it) }
                f.medium?.let { fo.put("medium", it) }
                f.semibold?.let { fo.put("semibold", it) }
                f.bold?.let { fo.put("bold", it) }
                o.put("font", fo)
            }
            accentDark?.let { o.put("accentDark", hex(it)) }
            background?.let { o.put("background", hex(it)) }
            backgroundDark?.let { o.put("backgroundDark", hex(it)) }
            text?.let { o.put("text", hex(it)) }
            textDark?.let { o.put("textDark", hex(it)) }
            return o.toString()
        }

    private fun hex(c: Int) = String.format("#%06X", c and 0xFFFFFF)

    data class Font(val regular: String? = null, val medium: String? = null, val semibold: String? = null, val bold: String? = null)
}
