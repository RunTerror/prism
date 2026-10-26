import 'dart:convert';

/// Something the widget asks the app to do. The widget never does these itself.
///
/// ```dart
/// onEffect: (effect) => switch (effect) {
///   PrismToast(:final text) => showMessage(text),
///   PrismOpen(:final url) => launchUrl(url),
///   PrismCopy(:final text) => Clipboard.setData(ClipboardData(text: text)),
///   PrismAsk(:final text) => sendToChat(text),
///   PrismAction(:final name, :final args) => runAction(name, args),
///   PrismOtherEffect() => null,
/// }
/// ```
sealed class PrismEffect {
  const PrismEffect();

  /// Maps the raw `(type, value)` pair sent by the native widget.
  factory PrismEffect.from(String type, String value) {
    switch (type) {
      case 'toast':
        return PrismToast(value);
      case 'copy':
        return PrismCopy(value);
      case 'ask':
        return PrismAsk(value);
      case 'action':
        // value: {"name": "send_email", "args": {"to": "..."}}
        try {
          final obj = jsonDecode(value);
          if (obj is Map && obj['name'] is String && (obj['name'] as String).isNotEmpty) {
            final args = obj['args'] is Map ? Map<String, Object>.from((obj['args'] as Map)
                ..removeWhere((k, v) => k is! String || v == null)) : <String, Object>{};
            return PrismAction(obj['name'] as String, args, value);
          }
        } catch (_) {}
        return PrismOtherEffect(type, value);
      case 'open':
        final url = Uri.tryParse(value);
        if (url != null && url.hasScheme) return PrismOpen(url);
        return PrismOtherEffect(type, value);
      default:
        return PrismOtherEffect(type, value);
    }
  }

  /// The effect type as sent by the widget ("toast", "open", ...).
  String get type;

  /// The effect value as sent by the widget.
  String get value;

  @override
  bool operator ==(Object other) =>
      other is PrismEffect && other.type == type && other.value == value;

  @override
  int get hashCode => Object.hash(type, value);

  @override
  String toString() => 'PrismEffect($type, $value)';
}

/// Show a short message (snack bar / toast).
final class PrismToast extends PrismEffect {
  const PrismToast(this.text);
  final String text;
  @override
  String get type => 'toast';
  @override
  String get value => text;
}

/// Open a URL.
final class PrismOpen extends PrismEffect {
  const PrismOpen(this.url);
  final Uri url;
  @override
  String get type => 'open';
  @override
  String get value => url.toString();
}

/// Copy text to the clipboard.
final class PrismCopy extends PrismEffect {
  const PrismCopy(this.text);
  final String text;
  @override
  String get type => 'copy';
  @override
  String get value => text;
}

/// Send text to the assistant as if the user typed it.
final class PrismAsk extends PrismEffect {
  const PrismAsk(this.text);
  final String text;
  @override
  String get type => 'ask';
  @override
  String get value => text;
}

/// The user tapped Allow on a `<Confirm>`: run one of the app's own actions, like `send_email`
/// with `{'to': 'priya@example.com'}`. Only a Confirm can send this, never the AI's code.
final class PrismAction extends PrismEffect {
  const PrismAction(this.name, this.args, this.value);
  final String name;
  final Map<String, Object> args;
  @override
  String get type => 'action';
  @override
  final String value;
}

/// Any effect this version does not know (also `open` with a value that is not a URL).
final class PrismOtherEffect extends PrismEffect {
  const PrismOtherEffect(this.type, this.value);
  @override
  final String type;
  @override
  final String value;
}
