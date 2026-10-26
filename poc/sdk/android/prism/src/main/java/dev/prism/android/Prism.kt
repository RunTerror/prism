package dev.prism.android

import android.content.Context
import com.snap.valdi.IValdiRuntime
import com.snap.valdi.ValdiRuntimeManager
import com.snap.valdi.support.SupportValdiRuntimeManager

/**
 * Process-wide setup: loads `libprism_sdk.so` and creates the single Valdi runtime manager
 * that every widget shares (one JS context, one Prism runtime).
 *
 * Call [start] early (e.g. in `Application.onCreate`) to pay the start-up cost up front;
 * widgets also call it lazily. Safe to call many times.
 */
object Prism {
    @Volatile
    private var manager: ValdiRuntimeManager? = null

    fun start(context: Context) {
        manager(context)
    }

    /**
     * A newer part library from your server: the code of `core/dist/prism-library.js` (our dev
     * server serves it at `GET /library`). The SDK carries a copy; when this one is newer it is
     * used instead, so new parts and design fixes reach users without an app update. Widgets made
     * after you set it use it. Older or broken code is ignored.
     */
    @Volatile
    var library: String? = null

    /**
     * Your brand. Every main button, slider, switch, progress bar, selected choice and link uses
     * its accent; Prism works out the lighter and darker shades for light and dark mode and keeps
     * text readable. Widgets on screen redraw when it changes.
     */
    var theme: PrismTheme? = null
        set(value) {
            field = value
            themeListeners.toList().forEach { it() }
        }

    internal val themeListeners = java.util.concurrent.CopyOnWriteArraySet<() -> Unit>()

    internal fun runtime(context: Context): IValdiRuntime = manager(context).mainRuntime

    private fun manager(context: Context): ValdiRuntimeManager {
        manager?.let { return it }
        synchronized(this) {
            manager?.let { return it }
            System.loadLibrary("prism_sdk")
            return SupportValdiRuntimeManager.createWithSupportLibs(context.applicationContext)
                .also { manager = it }
        }
    }
}
