import 'dart:convert';

/// Everything needed to bring a widget back instantly: its state, its last drawn screen and its
/// height. The widget sends one through `onSnapshot` (after the first draw, after every tap or
/// change, and when its height changes). Give it back as `snapshot` when the widget is made again
/// (a `ListView.builder` scrolled back, the chat reopened later): the saved screen is drawn on the
/// very first frame at the saved height, and the widget carries on from the saved state.
///
/// Store [json] as is. A snapshot only applies to the same block (envelope); for any other block
/// it is ignored.
class PrismSnapshot {
  const PrismSnapshot._(this.json, this.height);

  /// Reads a snapshot (one sent by the widget, or [json] stored earlier). null if it is not one.
  static PrismSnapshot? fromJson(String json) {
    try {
      final obj = jsonDecode(json);
      if (obj is! Map || obj['v'] != 1) return null;
      final height = obj['height'];
      return PrismSnapshot._(json, height is num ? height.toDouble() : 0);
    } on FormatException {
      return null;
    }
  }

  /// The snapshot itself. Opaque: store and give back unchanged.
  final String json;

  /// The widget's height when the snapshot was taken (logical pixels).
  final double height;

  @override
  bool operator ==(Object other) => other is PrismSnapshot && other.json == json;

  @override
  int get hashCode => json.hashCode;
}
