// The platform's own Material 3 controls, embedded in Valdi with <custom-view androidClass=...>.
// The Android side of prism_widgets/ios/PRSNativeControls.m: Slider, Switch, Select, and a
// MaterialButton example. Used where users expect the exact platform feel (CLIENTS.md section 4).
//
// Each class is a FrameLayout holding one Material control. The control is created inside a
// Material 3 theme (light or dark, from the pScheme attribute: Valdi doesn't report Android's dark
// mode), so host apps don't need a Material theme. Props come in as Valdi attributes; user changes
// go back to JS through function attributes (pOnChange / pOnPress).
package dev.prism.sdk.widgets

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.util.TypedValue
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.PopupMenu
import android.widget.TextView
import androidx.annotation.Keep
import com.google.android.material.button.MaterialButton
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.slider.Slider
import com.snap.valdi.attributes.AttributesBinder
import com.snap.valdi.attributes.AttributesBindingContext
import com.snap.valdi.attributes.RegisterAttributesBinder
import com.snap.valdi.callable.ValdiFunction
import com.snap.valdi.utils.ValdiMarshaller
import com.snap.valdi.views.ValdiTouchEventResult
import com.snap.valdi.views.ValdiTouchTarget
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val DEFAULT_TINT = 0xFF4F46E5.toInt()
private val CHECKED = intArrayOf(android.R.attr.state_checked)

/** Calls a JS function with one value. */
internal fun ValdiFunction?.callBool(v: Boolean) { val f = this ?: return; ValdiMarshaller.use { it.pushBoolean(v); f.perform(it) } }
internal fun ValdiFunction?.callDouble(v: Double) { val f = this ?: return; ValdiMarshaller.use { it.pushDouble(v); f.perform(it) } }
internal fun ValdiFunction?.callVoid() { val f = this ?: return; ValdiMarshaller.use { f.perform(it) } }

/** Base: holds one Material control, themed light/dark, and lets it receive touches. */
@Keep
abstract class PrismNativeControl(context: Context) : FrameLayout(context), ValdiTouchTarget {
    var scheme: String? = null
        private set
    var tint: Int = DEFAULT_TINT
    protected var control: View? = null

    private fun themeId(dark: Boolean): Int {
        val name = if (dark) "Theme.Material3.Dark.NoActionBar" else "Theme.Material3.Light.NoActionBar"
        return context.resources.getIdentifier(name, "style", context.packageName)
    }

    protected fun themedContext(): Context = ContextThemeWrapper(context, themeId(scheme == "dark"))

    protected fun attr(ctx: Context, name: String): Int {
        val id = ctx.resources.getIdentifier(name, "attr", ctx.packageName)
        if (id == 0) return 0
        return if (ctx.theme.resolveAttribute(id, TypedValue(), true)) id else 0
    }

    /** (Re)creates the Material control: on first use and when light/dark changes. */
    protected fun rebuild() {
        removeAllViews()
        val v = create(themedContext())
        control = v
        addView(v, childLayoutParams())
        apply()
        requestLayout()
    }

    protected abstract fun create(ctx: Context): View
    abstract fun apply()

    protected open fun childLayoutParams(): LayoutParams =
        LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER)

    fun setSchemeValue(value: String?) {
        if (value == scheme) return
        scheme = value
        rebuild()
    }

    // Valdi handles touches itself; hand them to the Material control.
    override fun processTouchEvent(event: MotionEvent): ValdiTouchEventResult =
        if (dispatchTouchEvent(event)) ValdiTouchEventResult.ConsumeEventAndCancelOtherGestures
        else ValdiTouchEventResult.IgnoreEvent
}

/** Controls that fill the width they are given (slider, select). */
@Keep
abstract class PrismStretchyControl(context: Context) : PrismNativeControl(context) {
    override fun childLayoutParams(): LayoutParams =
        LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER_VERTICAL)

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val preferred = (120 * resources.displayMetrics.density).roundToInt()
        val w = when (MeasureSpec.getMode(widthMeasureSpec)) {
            MeasureSpec.EXACTLY -> widthMeasureSpec
            MeasureSpec.AT_MOST -> MeasureSpec.makeMeasureSpec(min(preferred, MeasureSpec.getSize(widthMeasureSpec)), MeasureSpec.EXACTLY)
            else -> MeasureSpec.makeMeasureSpec(preferred, MeasureSpec.EXACTLY)
        }
        super.onMeasure(w, heightMeasureSpec)
    }
}

internal fun <T : PrismNativeControl> bindCommon(b: AttributesBindingContext<T>) {
    b.bindStringAttribute("pScheme", false, { v, s, _ -> v.setSchemeValue(s) }, { v, _ -> v.setSchemeValue(null) })
    b.bindColorAttribute("pTint", false, { v, c, _ -> v.tint = c; v.apply() }, { v, _ -> v.tint = DEFAULT_TINT; v.apply() })
}

// ------------------------------------------------------------------ Slider

/** Material Slider. pValue, pMin, pMax, pStep, pDisabled, pOnChange(number). */
@Keep
class PrismNativeSlider(context: Context) : PrismStretchyControl(context) {
    var value = 0.0
    var minValue = 0.0
    var maxValue = 100.0
    var step = 1.0
    var disabled = false
    var onChange: ValdiFunction? = null
    private var tracking = false
    private var lastSent = Double.NaN

    init { rebuild() }

    override fun create(ctx: Context): View {
        val s = Slider(ctx)
        s.addOnChangeListener { _, v, fromUser ->
            if (fromUser) {
                val x = snap(v.toDouble())
                if (x != lastSent) { lastSent = x; onChange.callDouble(x) }
            }
        }
        s.addOnSliderTouchListener(object : Slider.OnSliderTouchListener {
            override fun onStartTrackingTouch(slider: Slider) { tracking = true }
            override fun onStopTrackingTouch(slider: Slider) { tracking = false; lastSent = Double.NaN; apply() }
        })
        return s
    }

    private fun snap(raw: Double): Double {
        val hi = if (maxValue > minValue) maxValue else minValue + 1
        val st = if (step > 0) step else 1.0
        val v = minValue + Math.round((raw - minValue) / st) * st
        return min(hi, max(minValue, v))
    }

    override fun apply() {
        val s = control as? Slider ?: return
        val hi = if (maxValue > minValue) maxValue else minValue + 1
        s.valueFrom = minValue.toFloat()
        s.valueTo = hi.toFloat()
        s.stepSize = 0f  // we snap ourselves (Material requires the range to divide by stepSize)
        if (!tracking) s.value = min(hi, max(minValue, value)).toFloat()
        s.trackActiveTintList = ColorStateList.valueOf(tint)
        s.thumbTintList = ColorStateList.valueOf(tint)
        // The empty part of the track: our quiet grey (tokens border), not Material's purple tint.
        s.trackInactiveTintList = ColorStateList.valueOf(if (scheme == "dark") 0xFF2B2B33.toInt() else 0xFFE4E4E9.toInt())
        s.isEnabled = !disabled
    }
}

@Keep
@RegisterAttributesBinder
class PrismNativeSliderBinder(private val context: Context) : AttributesBinder<PrismNativeSlider> {
    override val viewClass: Class<PrismNativeSlider> get() = PrismNativeSlider::class.java
    override fun bindAttributes(attributesBindingContext: AttributesBindingContext<PrismNativeSlider>) {
        val b = attributesBindingContext
        bindCommon(b)
        b.bindFloatAttribute("pValue", false, { v, x, _ -> v.value = x.toDouble(); v.apply() }, { v, _ -> v.value = 0.0; v.apply() })
        b.bindFloatAttribute("pMin", false, { v, x, _ -> v.minValue = x.toDouble(); v.apply() }, { v, _ -> v.minValue = 0.0; v.apply() })
        b.bindFloatAttribute("pMax", false, { v, x, _ -> v.maxValue = x.toDouble(); v.apply() }, { v, _ -> v.maxValue = 100.0; v.apply() })
        b.bindFloatAttribute("pStep", false, { v, x, _ -> v.step = x.toDouble(); v.apply() }, { v, _ -> v.step = 1.0; v.apply() })
        b.bindBooleanAttribute("pDisabled", false, { v, x, _ -> v.disabled = x; v.apply() }, { v, _ -> v.disabled = false; v.apply() })
        b.bindFunctionAttribute("pOnChange", { v, f -> v.onChange = f }, { v -> v.onChange = null })
    }
}

// ------------------------------------------------------------------ Switch

/** MaterialSwitch. pValue, pDisabled, pOnChange(bool). */
@Keep
class PrismNativeSwitch(context: Context) : PrismNativeControl(context) {
    var value = false
    var disabled = false
    var onChange: ValdiFunction? = null
    private var applying = false
    private var origTrack: ColorStateList? = null

    init { rebuild() }

    override fun create(ctx: Context): View {
        val s = MaterialSwitch(ctx)
        origTrack = s.trackTintList
        s.setOnCheckedChangeListener { _, checked -> if (!applying) onChange.callBool(checked) }
        return s
    }

    override fun apply() {
        val s = control as? MaterialSwitch ?: return
        val off = origTrack?.defaultColor ?: Color.GRAY
        s.trackTintList = ColorStateList(arrayOf(CHECKED, intArrayOf()), intArrayOf(tint, off))
        s.isEnabled = !disabled
        if (s.isChecked != value) { applying = true; s.isChecked = value; applying = false }
    }
}

@Keep
@RegisterAttributesBinder
class PrismNativeSwitchBinder(private val context: Context) : AttributesBinder<PrismNativeSwitch> {
    override val viewClass: Class<PrismNativeSwitch> get() = PrismNativeSwitch::class.java
    override fun bindAttributes(attributesBindingContext: AttributesBindingContext<PrismNativeSwitch>) {
        val b = attributesBindingContext
        bindCommon(b)
        b.bindBooleanAttribute("pValue", false, { v, x, _ -> v.value = x; v.apply() }, { v, _ -> v.value = false; v.apply() })
        b.bindBooleanAttribute("pDisabled", false, { v, x, _ -> v.disabled = x; v.apply() }, { v, _ -> v.disabled = false; v.apply() })
        b.bindFunctionAttribute("pOnChange", { v, f -> v.onChange = f }, { v -> v.onChange = null })
        b.setPlaceholderViewMeasureDelegate(lazy { PrismNativeSwitch(context) })
    }
}

// ------------------------------------------------------------------ Select

/** A field showing the chosen option; a tap opens Android's own popup menu of the options.
 *  pItems (labels, one per line), pSelected (index, -1 = none), pPlaceholder, pColor, pMutedColor,
 *  pDisabled, pOnChange(index). */
@Keep
class PrismNativeSelect(context: Context) : PrismStretchyControl(context) {
    var items: List<String> = emptyList()
    var selected = -1
    var placeholder = "Choose…"
    var color = Color.BLACK
    var mutedColor = Color.GRAY
    var disabled = false
    var onChange: ValdiFunction? = null

    init { rebuild() }

    override fun create(ctx: Context): View {
        val t = TextView(ctx)
        val pad = (12 * resources.displayMetrics.density).roundToInt()
        t.setPadding(pad, 0, pad, 0)
        t.gravity = Gravity.CENTER_VERTICAL
        t.minHeight = (40 * resources.displayMetrics.density).roundToInt()
        t.textSize = 15f
        t.setOnClickListener { if (!disabled) showMenu(it) }
        return t
    }

    private fun showMenu(anchor: View) {
        val menu = PopupMenu(themedContext(), anchor)
        items.forEachIndexed { i, label -> menu.menu.add(0, i, i, label).isCheckable = true; if (i == selected) menu.menu.getItem(i).isChecked = true }
        menu.setOnMenuItemClickListener { item -> onChange.callDouble(item.itemId.toDouble()); true }
        menu.show()
    }

    override fun apply() {
        val t = control as? TextView ?: return
        val chosen = selected in items.indices
        t.text = (if (chosen) items[selected] else placeholder) + "  ▾"
        t.setTextColor(if (chosen) color else mutedColor)
        t.alpha = if (disabled) 0.5f else 1f
    }
}

@Keep
@RegisterAttributesBinder
class PrismNativeSelectBinder(private val context: Context) : AttributesBinder<PrismNativeSelect> {
    override val viewClass: Class<PrismNativeSelect> get() = PrismNativeSelect::class.java
    override fun bindAttributes(attributesBindingContext: AttributesBindingContext<PrismNativeSelect>) {
        val b = attributesBindingContext
        bindCommon(b)
        b.bindStringAttribute("pItems", false, { v, s, _ -> v.items = if (s.isEmpty()) emptyList() else s.split("\n"); v.apply() }, { v, _ -> v.items = emptyList(); v.apply() })
        b.bindFloatAttribute("pSelected", false, { v, x, _ -> v.selected = x.toInt(); v.apply() }, { v, _ -> v.selected = -1; v.apply() })
        b.bindStringAttribute("pPlaceholder", false, { v, s, _ -> v.placeholder = if (s.isEmpty()) "Choose…" else s; v.apply() }, { v, _ -> v.placeholder = "Choose…"; v.apply() })
        b.bindColorAttribute("pColor", false, { v, c, _ -> v.color = c; v.apply() }, { v, _ -> v.color = Color.BLACK; v.apply() })
        b.bindColorAttribute("pMutedColor", false, { v, c, _ -> v.mutedColor = c; v.apply() }, { v, _ -> v.mutedColor = Color.GRAY; v.apply() })
        b.bindBooleanAttribute("pDisabled", false, { v, x, _ -> v.disabled = x; v.apply() }, { v, _ -> v.disabled = false; v.apply() })
        b.bindFunctionAttribute("pOnChange", { v, f -> v.onChange = f }, { v -> v.onChange = null })
    }
}

// ------------------------------------------------------------------ Button (example only)

/** MaterialButton: solid -> filled, outline -> outlined, ghost -> text button.
 *  (Liquid Glass is iOS only; if "glass" ever reaches Android it falls back to outlined / filled.) */
@Keep
class PrismNativeButton(context: Context) : PrismNativeControl(context) {
    var label = ""
    var variant = "solid"
        set(value) { if (field != value) { field = value; rebuild() } }
    var onPress: ValdiFunction? = null

    init { rebuild() }

    override fun create(ctx: Context): View {
        val style = when (variant) {
            "outline", "glass" -> attr(ctx, "materialButtonOutlinedStyle")
            "ghost" -> attr(ctx, "borderlessButtonStyle")
            else -> attr(ctx, "materialButtonStyle")
        }
        val b = MaterialButton(ctx, null, style)
        b.setOnClickListener { onPress.callVoid() }
        return b
    }

    override fun apply() {
        val b = control as? MaterialButton ?: return
        b.text = label
        b.isAllCaps = false
        if (variant == "solid" || variant == "glassProminent") b.backgroundTintList = ColorStateList.valueOf(tint)
        else b.setTextColor(tint)
    }
}

@Keep
@RegisterAttributesBinder
class PrismNativeButtonBinder(private val context: Context) : AttributesBinder<PrismNativeButton> {
    override val viewClass: Class<PrismNativeButton> get() = PrismNativeButton::class.java
    override fun bindAttributes(attributesBindingContext: AttributesBindingContext<PrismNativeButton>) {
        val b = attributesBindingContext
        bindCommon(b)
        b.bindStringAttribute("pLabel", true, { v, s, _ -> v.label = s; v.apply() }, { v, _ -> v.label = ""; v.apply() })
        b.bindStringAttribute("pVariant", true, { v, s, _ -> v.variant = s; v.apply() }, { v, _ -> v.variant = "solid"; v.apply() })
        b.bindFunctionAttribute("pOnPress", { v, f -> v.onPress = f }, { v -> v.onPress = null })
        b.setPlaceholderViewMeasureDelegate(lazy { PrismNativeButton(context) })
    }
}
