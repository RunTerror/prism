package dev.prism.size

import android.app.Activity
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import dev.prism.android.PrismWidgetView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(TextView(this).apply { text = "Hello" })
        root.addView(PrismWidgetView(this).apply { setEnvelope("{}", "size-check") })
        setContentView(root)
    }
}
