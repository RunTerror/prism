package dev.prism.android

import org.json.JSONObject

/** Something the widget asks the host to do. The widget never does these itself. */
sealed class PrismEffect {
    /** Show a short message (e.g. an Android Toast). */
    data class Toast(val text: String) : PrismEffect()
    /** Open a URL. */
    data class Open(val url: String) : PrismEffect()
    /** Copy text to the clipboard. */
    data class Copy(val text: String) : PrismEffect()
    /** Send text to the assistant / chat as if the user typed it. */
    data class Ask(val text: String) : PrismEffect()
    /**
     * The user tapped Allow on a `<Confirm>`: run one of the app's own actions, like `send_email`
     * with `to = "priya@example.com"`. Only a Confirm can send this, never the AI's code.
     */
    data class Action(val name: String, val args: Map<String, Any>) : PrismEffect()
    /** Any effect type this version does not know. */
    data class Other(val type: String, val value: String) : PrismEffect()

    companion object {
        /** Maps the raw (type, value) pair from the Valdi widget. */
        fun from(type: String, value: String): PrismEffect = when (type) {
            "toast" -> Toast(value)
            "open" -> Open(value)
            "copy" -> Copy(value)
            "ask" -> Ask(value)
            "action" -> action(value) ?: Other(type, value)
            else -> Other(type, value)
        }

        /** value: {"name": "send_email", "args": {"to": "..."}}; null if it isn't that shape. */
        private fun action(value: String): Action? = runCatching {
            val obj = JSONObject(value)
            val name = obj.optString("name")
            if (name.isEmpty()) return null
            val raw = obj.optJSONObject("args")
            val args = mutableMapOf<String, Any>()
            raw?.keys()?.forEach { key -> raw.opt(key)?.takeIf { it != JSONObject.NULL }?.let { args[key] = it } }
            Action(name, args)
        }.getOrNull()
    }
}
