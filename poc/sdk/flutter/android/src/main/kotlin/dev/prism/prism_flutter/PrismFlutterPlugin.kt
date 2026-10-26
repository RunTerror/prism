package dev.prism.prism_flutter

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import dev.prism.android.Prism
import dev.prism.android.PrismSnapshot
import dev.prism.android.PrismWidgetView
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory

/** Registers the `dev.prism/widget` platform view and the `dev.prism/sdk` channel. */
class PrismFlutterPlugin : FlutterPlugin, MethodChannel.MethodCallHandler {
    private var channel: MethodChannel? = null
    private var context: Context? = null

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        context = binding.applicationContext
        channel = MethodChannel(binding.binaryMessenger, "dev.prism/sdk").also { it.setMethodCallHandler(this) }
        binding.platformViewRegistry.registerViewFactory("dev.prism/widget", PrismViewFactory(binding.binaryMessenger))
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel?.setMethodCallHandler(null)
        channel = null
        context = null
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "start" -> {
                context?.let { Prism.start(it) }
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }
}

private class PrismViewFactory(private val messenger: BinaryMessenger) :
    PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    override fun create(context: Context, viewId: Int, args: Any?): PlatformView =
        PrismPlatformView(context, viewId, args as? Map<*, *> ?: emptyMap<String, Any>(), messenger)
}

/** One `PrismWidget` on the Dart side = one [PrismWidgetView] here, talking over its own channel. */
private class PrismPlatformView(
    context: Context,
    viewId: Int,
    args: Map<*, *>,
    messenger: BinaryMessenger,
) : PlatformView, MethodChannel.MethodCallHandler {
    private val widget = PrismWidgetView(context)
    private val container = Container(context, widget)
    private val channel = MethodChannel(messenger, "dev.prism/widget_$viewId")
    private val density = context.resources.displayMetrics.density

    init {
        widget.onHeightChange = { px -> channel.invokeMethod("height", (px / density).toDouble()) }
        widget.onEffect = { e ->
            val (type, value) = when (e) {
                is dev.prism.android.PrismEffect.Toast -> "toast" to e.text
                is dev.prism.android.PrismEffect.Open -> "open" to e.url
                is dev.prism.android.PrismEffect.Copy -> "copy" to e.text
                is dev.prism.android.PrismEffect.Ask -> "ask" to e.text
                is dev.prism.android.PrismEffect.Other -> e.type to e.value
            }
            channel.invokeMethod("effect", mapOf("type" to type, "value" to value))
        }
        widget.onSnapshot = { s -> channel.invokeMethod("snapshot", s.json) }
        channel.setMethodCallHandler(this)
        apply(args)
    }

    override fun getView(): View = container

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "setEnvelope" -> {
                apply(call.arguments as? Map<*, *> ?: emptyMap<String, Any>())
                result.success(null)
            }
            "setColorScheme" -> {
                widget.darkOverride = dark(call.arguments as? String)
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun apply(args: Map<*, *>) {
        widget.darkOverride = dark(args["colorScheme"] as? String)
        widget.setEnvelope(
            envelopeJson = args["envelopeJson"] as? String ?: "",
            instanceId = args["instanceId"] as? String ?: "",
            snapshot = (args["snapshotJson"] as? String)?.let { PrismSnapshot.from(it) },
        )
    }

    override fun dispose() {
        channel.setMethodCallHandler(null)
        widget.onHeightChange = null
        widget.onEffect = null
        widget.onSnapshot = null
        widget.destroy()
    }

    private fun dark(scheme: String?): Boolean? = when (scheme) {
        "dark" -> true
        "light" -> false
        else -> null
    }

    /**
     * Flutter gives the platform view an exact size, which starts at almost nothing. The Prism view
     * must measure its own content height to report it, so it is laid out at its natural height
     * inside this container (which clips it) instead of at the size Flutter gives.
     */
    private class Container(context: Context, private val child: PrismWidgetView) : FrameLayout(context) {
        init {
            clipChildren = true
            addView(child)
        }

        override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
            val width = MeasureSpec.getSize(widthMeasureSpec)
            child.measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
            )
            setMeasuredDimension(width, MeasureSpec.getSize(heightMeasureSpec))
        }

        override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
            child.layout(0, 0, child.measuredWidth, child.measuredHeight)
        }
    }
}
