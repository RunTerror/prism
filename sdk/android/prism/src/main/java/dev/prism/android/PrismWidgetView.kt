package dev.prism.android

import android.content.Context
import android.content.res.Configuration
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.widget.FrameLayout
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.findViewTreeLifecycleOwner
import dev.prism.sdk.PrismWidget
import dev.prism.sdk.PrismWidgetContext
import dev.prism.sdk.PrismWidgetViewModel
import kotlin.math.ceil

/**
 * Draws one Prism widget (an envelope JSON) with the native Valdi drawer.
 *
 * - Use `match_parent` (or a fixed) width and `wrap_content` height: the view measures to the
 *   widget's content height and re-measures when it changes ([onHeightChange] reports it in px).
 * - Follows the system light/dark mode (also on configuration changes the activity handles itself).
 * - Callbacks always arrive on the main thread.
 * - The Valdi view is destroyed when this view is removed for good (removed from its parent, or
 *   its lifecycle owner is destroyed). If it is attached again later it is rebuilt from the
 *   last snapshot.
 * - In lazy lists (LazyColumn, RecyclerView), keep the last [onSnapshot] per block and pass it
 *   back to [setEnvelope]: the widget then appears instantly, as the user left it.
 */
class PrismWidgetView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    /** Called when the widget asks the host to do something (toast, open a URL, ...). */
    var onEffect: ((PrismEffect) -> Unit)? = null

    /** Called with a new snapshot: after the first draw, after every user event, and when the
     *  height changes. Save it and pass it back to [setEnvelope] to bring the widget back instantly. */
    var onSnapshot: ((PrismSnapshot) -> Unit)? = null

    /** Called when the widget's content height changes, in pixels. */
    var onHeightChange: ((Int) -> Unit)? = null

    private val main = Handler(Looper.getMainLooper())

    private var widget: PrismWidget? = null
    private var envelopeJson: String? = null
    private var instanceId: String? = null
    /** Latest snapshot: the caller's, then whatever the widget reports. */
    private var snapshot: PrismSnapshot? = null
    private var colorScheme: String = systemColorScheme(resources.configuration)
    /** Forces light (false) or dark (true). null = follow this view's Configuration.
     *  Set by the Compose wrapper (isSystemInDarkTheme) and the Flutter plugin (app theme). */
    var darkOverride: Boolean? = null
        set(value) {
            field = value
            updateColorScheme()
        }

    private var contentHeightPx = 0
    /** Bumped on every new Valdi view so callbacks from an old one are ignored. */
    private var generation = 0

    private var lifecycleOwner: LifecycleOwner? = null
    private val lifecycleObserver = LifecycleEventObserver { _, event ->
        if (event == Lifecycle.Event.ON_DESTROY) destroy()
    }

    /**
     * Shows [envelopeJson]. [instanceId] must be unique per widget on screen; [snapshot] is one
     * from [onSnapshot] to start from (read once, when the widget loads).
     * Calling it again with the same envelope and id does nothing; a new envelope or id reloads.
     */
    fun setEnvelope(envelopeJson: String, instanceId: String, snapshot: PrismSnapshot? = null) {
        if (envelopeJson == this.envelopeJson && instanceId == this.instanceId && widget != null) return
        this.envelopeJson = envelopeJson
        this.instanceId = instanceId
        this.snapshot = snapshot
        // With a snapshot the view starts at its old height, so a list doesn't jump.
        snapshot?.let { contentHeightPx = ceil(it.heightDp * resources.displayMetrics.density).toInt() }
        val w = widget
        if (w == null) {
            createWidget()
        } else {
            w.viewModel = viewModel()
        }
    }

    /** Destroys the Valdi view now (frees its JS side). Done automatically; call it only if you
     *  manage the lifetime yourself (e.g. a Flutter / React Native view being disposed). */
    fun destroy() {
        val w = widget ?: return
        widget = null
        generation++
        removeView(w)
        w.destroy()
    }

    // --- Valdi view ---

    private fun viewModel() = PrismWidgetViewModel(
        envelopeJson = envelopeJson!!,
        instanceId = instanceId!!,
        snapshotJson = snapshot?.json,
        libraryJs = Prism.library,
        themeJson = Prism.theme?.json,
        colorScheme = colorScheme,
    )

    private fun createWidget() {
        if (envelopeJson == null) return
        val gen = ++generation
        val ctx = PrismWidgetContext(
            onContentHeight = { dp -> onMain(gen) { setContentHeight(dp) } },
            onEffect = { type, value -> onMain(gen) { onEffect?.invoke(PrismEffect.from(type, value)) } },
            onSnapshot = { json ->
                onMain(gen) { PrismSnapshot.from(json)?.let { snapshot = it; onSnapshot?.invoke(it) } }
            },
        )
        val w = PrismWidget.create(Prism.runtime(context), viewModel(), ctx)
        widget = w
        addView(w, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    private fun onMain(gen: Int, block: () -> Unit) {
        val run = Runnable { if (gen == generation) block() }
        if (Looper.myLooper() == Looper.getMainLooper()) run.run() else main.post(run)
    }

    private fun setContentHeight(dp: Double) {
        val px = ceil(dp * resources.displayMetrics.density).toInt()
        if (px == contentHeightPx) return
        contentHeightPx = px
        requestLayout()
        onHeightChange?.invoke(px)
    }

    // --- sizing: width from the parent, height = content height unless the parent fixes it ---

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val childW = MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY)
        // The Valdi view only lays out (and only then reports onContentHeight) once it has a
        // size, so before the first report ask it for its natural height instead.
        val wanted = if (contentHeightPx > 0 || MeasureSpec.getMode(heightMeasureSpec) == MeasureSpec.EXACTLY) {
            contentHeightPx
        } else {
            widget?.let {
                it.measure(childW, MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED))
                it.measuredHeight
            } ?: 0
        }
        val height = when (MeasureSpec.getMode(heightMeasureSpec)) {
            MeasureSpec.EXACTLY -> MeasureSpec.getSize(heightMeasureSpec)
            MeasureSpec.AT_MOST -> minOf(wanted, MeasureSpec.getSize(heightMeasureSpec))
            else -> wanted
        }
        val childH = MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        for (i in 0 until childCount) getChildAt(i).measure(childW, childH)
        setMeasuredDimension(width, height)
    }

    // --- dark mode ---

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        updateColorScheme(newConfig)
    }

    private fun updateColorScheme(config: Configuration = resources.configuration) {
        val scheme = darkOverride?.let { if (it) "dark" else "light" } ?: systemColorScheme(config)
        if (scheme == colorScheme) return
        colorScheme = scheme
        // Same envelope + instanceId: the widget keeps its state and only redraws.
        widget?.viewModel = viewModel()
    }

    private fun systemColorScheme(config: Configuration) =
        if (config.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"

    // --- lifetime ---

    /** A new brand from the app: redraw (same envelope and id, so the widget keeps its state). */
    private val onThemeChange: () -> Unit = { main.post { widget?.viewModel = viewModel() } }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Prism.themeListeners.add(onThemeChange)
        updateColorScheme()
        if (widget == null) createWidget()
        val owner = findViewTreeLifecycleOwner()
        if (owner !== lifecycleOwner) {
            lifecycleOwner?.lifecycle?.removeObserver(lifecycleObserver)
            lifecycleOwner = owner
            owner?.lifecycle?.addObserver(lifecycleObserver)
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        Prism.themeListeners.remove(onThemeChange)
        // Detached "for good" = no longer in a parent (or the screen is gone). Checked after the
        // current frame so moves between parents (detach + attach right away) keep the view.
        main.post {
            if (isAttachedToWindow) return@post
            val owner = lifecycleOwner
            if (parent == null || owner == null || owner.lifecycle.currentState == Lifecycle.State.DESTROYED) {
                owner?.lifecycle?.removeObserver(lifecycleObserver)
                lifecycleOwner = null
                destroy()
            }
        }
    }
}
