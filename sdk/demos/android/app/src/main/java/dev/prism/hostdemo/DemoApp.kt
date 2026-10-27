package dev.prism.hostdemo

import android.app.Application
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import dev.prism.android.Prism
import dev.prism.android.PrismEffect
import dev.prism.android.PrismTheme
import org.json.JSONArray

class DemoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Prism.start(this) // optional; widgets would start it lazily
        // The demo app's brand: coral, like the website. Deeper in light mode so it stays readable.
        Prism.theme = PrismTheme(accent = 0xFFE5483C.toInt(), accentDark = 0xFFFF5A4E.toInt())
    }
}

data class Example(val id: String, val title: String, val source: String, val envelopeJson: String)

object Demo {
    /** Last snapshot per widget key, in memory only (survives leaving and reopening a screen). */
    val snapshots = mutableMapOf<String, dev.prism.android.PrismSnapshot>()

    private var cache: List<Example>? = null

    fun examples(context: Context): List<Example> = cache ?: run {
        val text = context.assets.open("examples.json").bufferedReader().use { it.readText() }
        val arr = JSONArray(text)
        List(arr.length()) { i ->
            val o = arr.getJSONObject(i)
            Example(o.getString("id"), o.getString("title"), o.getString("source"), o.getJSONObject("envelope").toString())
        }.let { it + effectsExample(it.first { e -> e.id == "02-counter" }) }.also { cache = it }
    }

    fun setLightBars(window: android.view.Window, light: Boolean) {
        val c = androidx.core.view.WindowCompat.getInsetsController(window, window.decorView)
        c.isAppearanceLightStatusBars = light
        c.isAppearanceLightNavigationBars = light
    }

    /** Demo only: none of the 6 examples emits effects yet (the compiler does not accept
     *  toast/copy/ask), so patch the compiled counter to call the runtime's P.toast/P.copy/P.ask. */
    private fun effectsExample(counter: Example): Example {
        val env = org.json.JSONObject(counter.envelopeJson)
        env.put("id", "07-effects")
        env.put("code", env.getString("code")
            .replace("(P.tick(), S.count--)", "(P.tick(), S.count--, P.copy(\"Count was \" + (S.count + 1)))")
            .replace("(P.tick(), S.count++)", "(P.tick(), S.count++, P.toast(\"Count is \" + S.count))")
            .replace("(P.tick(), S.count = 0)", "(P.tick(), S.count = 0, P.ask(\"Why reset?\"))"))
        return Example("07-effects", "Effects (patched counter, demo only)",
            "// The compiled 02-counter with P.copy / P.toast / P.ask added to -1 / +1 / Reset.\n\n" + counter.source,
            env.toString())
    }

    fun handleEffect(context: Context, effect: PrismEffect) {
        fun toast(s: String) = Toast.makeText(context, s, Toast.LENGTH_SHORT).show()
        when (effect) {
            is PrismEffect.Toast -> toast(effect.text)
            is PrismEffect.Open -> runCatching {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(effect.url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }.onFailure { toast("Open: ${effect.url}") }
            is PrismEffect.Copy -> {
                context.getSystemService(ClipboardManager::class.java)
                    .setPrimaryClip(ClipData.newPlainText("Prism", effect.text))
                toast("Copied: ${effect.text}")
            }
            is PrismEffect.Ask -> toast("Ask: ${effect.text}")
            is PrismEffect.Action -> toast("The app would now run “${effect.name}”")
            is PrismEffect.Other -> toast("${effect.type}: ${effect.value}")
        }
    }
}
