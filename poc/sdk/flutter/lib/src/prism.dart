import 'package:flutter/services.dart';

/// Entry point of the Prism SDK.
abstract final class Prism {
  static const _channel = MethodChannel('dev.prism/sdk');

  /// Creates the shared native runtime (one per app). Safe to call many times; widgets start it
  /// themselves, so calling it early (for example in `main`) only warms things up.
  static Future<void> start() => _channel.invokeMethod<void>('start');
}
