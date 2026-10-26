package dev.prism.android

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Draws one Prism widget. Takes the full width and sizes itself to the widget's content height
 * (no fixed height needed; works inside a scrolling Column). Follows [isSystemInDarkTheme].
 *
 * A new [envelopeJson] or [instanceId] reloads the widget; [snapshot] is read when it loads.
 * In a LazyColumn, keep the last [onSnapshot] per block and pass it back as [snapshot]: a widget
 * that scrolls away and back then appears instantly, as the user left it.
 */
@Composable
fun PrismWidget(
    envelopeJson: String,
    instanceId: String,
    modifier: Modifier = Modifier,
    snapshot: PrismSnapshot? = null,
    onEffect: (PrismEffect) -> Unit = {},
    onSnapshot: (PrismSnapshot) -> Unit = {},
) {
    val dark = isSystemInDarkTheme()
    val currentOnEffect by rememberUpdatedState(onEffect)
    val currentOnSnapshot by rememberUpdatedState(onSnapshot)
    AndroidView(
        modifier = modifier.fillMaxWidth(),
        factory = { ctx ->
            PrismWidgetView(ctx).apply {
                this.onEffect = { currentOnEffect(it) }
                this.onSnapshot = { currentOnSnapshot(it) }
            }
        },
        update = { view ->
            view.darkOverride = dark
            view.setEnvelope(envelopeJson, instanceId, snapshot)
        },
        onRelease = { view -> view.destroy() },
    )
}
