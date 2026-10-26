package dev.prism.hostdemo

import android.app.Activity
import android.content.res.Configuration
import android.os.Bundle
import android.widget.TextView
import dev.prism.android.PrismWidgetView

/** Classic Views host: two PrismWidgetViews (wrap_content) in a ScrollView. */
class ViewsActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_views)
        Demo.setLightBars(window, !isNight(resources.configuration))
        val examples = Demo.examples(this).associateBy { it.id }
        bind(findViewById(R.id.counter), examples.getValue("02-counter"))
        bind(findViewById(R.id.tasks), examples.getValue("03-tasks"))
    }

    private fun isNight(c: Configuration) =
        c.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES

    private fun bind(view: PrismWidgetView, ex: Example) {
        val key = "views:${ex.id}"
        view.onEffect = { Demo.handleEffect(this, it) }
        view.onSnapshot = { Demo.snapshots[key] = it }
        view.setEnvelope(ex.envelopeJson, instanceId = key, snapshot = Demo.snapshots[key])
    }

    // uiMode is handled in place (see manifest): the widgets follow by themselves; the host
    // only re-applies its own colours.
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        findViewById<android.view.View>(R.id.scroll).setBackgroundColor(getColor(R.color.prism_background))
        Demo.setLightBars(window, !isNight(newConfig))
        window.setBackgroundDrawableResource(R.color.prism_background)
        findViewById<TextView>(R.id.title).setTextColor(getColor(R.color.prism_text))
        for (id in intArrayOf(R.id.note1, R.id.note2, R.id.note3)) findViewById<TextView>(id).setTextColor(getColor(R.color.prism_muted))
    }
}
