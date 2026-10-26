package dev.prism.android

import org.json.JSONObject

/**
 * Everything needed to bring a widget back instantly: its state, its last drawn screen and its
 * height. The widget sends one through `onSnapshot` (after the first draw, after every tap or
 * change, and when its height changes). Give it back as `snapshot` when the widget is made again
 * (a LazyColumn / RecyclerView scrolled back, the chat reopened later): the saved screen is drawn
 * on the very first frame at the saved height, and the widget carries on from the saved state.
 *
 * Store [json] as is. A snapshot only applies to the same block (envelope); for any other block it
 * is ignored.
 */
class PrismSnapshot private constructor(
    /** The snapshot itself. Opaque: store and give back unchanged. */
    val json: String,
    /** The widget's height when the snapshot was taken, in dp. */
    val heightDp: Double,
) {
    override fun equals(other: Any?) = other is PrismSnapshot && other.json == json
    override fun hashCode() = json.hashCode()

    companion object {
        /** Reads a snapshot (one sent by the widget, or [json] stored earlier). null if it is not one. */
        fun from(json: String): PrismSnapshot? = try {
            val obj = JSONObject(json)
            if (obj.optInt("v") == 1) PrismSnapshot(json, obj.optDouble("height", 0.0)) else null
        } catch (e: Exception) {
            null
        }
    }
}
