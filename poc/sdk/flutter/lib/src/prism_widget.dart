import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';

import 'prism_effect.dart';
import 'prism_snapshot.dart';

const _viewType = 'dev.prism/widget';

/// Draws one Prism widget (an envelope JSON) with the native Prism drawer.
///
/// - Fills the width it is given and sizes its height to the content (no `SizedBox` needed).
/// - Follows [brightness], or the app's `Theme` brightness when it is null.
/// - Works inside scroll views: vertical drags scroll the list, taps and horizontal drags
///   (sliders, wide tables) go to the widget.
/// - In `ListView.builder`, keep the last [onSnapshot] per block and pass it back as [snapshot]:
///   a widget scrolled away and back then appears instantly, as the user left it.
class PrismWidget extends StatefulWidget {
  const PrismWidget({
    super.key,
    required this.envelopeJson,
    required this.instanceId,
    this.snapshot,
    this.brightness,
    this.onEffect,
    this.onSnapshot,
  });

  /// The envelope from the server, as a JSON string.
  final String envelopeJson;

  /// Unique per widget on screen (for example `"msg_1/block_0"`).
  final String instanceId;

  /// A snapshot saved earlier from [onSnapshot]. Read when the widget loads.
  final PrismSnapshot? snapshot;

  /// Light or dark. null = follow `Theme.of(context).brightness`.
  final Brightness? brightness;

  /// Called when the widget asks the app to do something (toast, open a URL, ...).
  final ValueChanged<PrismEffect>? onEffect;

  /// Called with a new snapshot: after the first draw, after every user event, and when the
  /// height changes.
  final ValueChanged<PrismSnapshot>? onSnapshot;

  @override
  State<PrismWidget> createState() => _PrismWidgetState();
}

class _PrismWidgetState extends State<PrismWidget> {
  MethodChannel? _channel;
  late double _height = widget.snapshot?.height ?? 0;
  String? _sentScheme;

  static final _gestures = <Factory<OneSequenceGestureRecognizer>>{
    Factory<HorizontalDragGestureRecognizer>(HorizontalDragGestureRecognizer.new),
    Factory<TapGestureRecognizer>(TapGestureRecognizer.new),
    Factory<LongPressGestureRecognizer>(LongPressGestureRecognizer.new),
  };

  String get _scheme =>
      (widget.brightness ?? Theme.of(context).brightness) == Brightness.dark ? 'dark' : 'light';

  @override
  void didUpdateWidget(PrismWidget old) {
    super.didUpdateWidget(old);
    final channel = _channel;
    if (channel == null) return;
    if (old.envelopeJson != widget.envelopeJson || old.instanceId != widget.instanceId) {
      channel.invokeMethod<void>('setEnvelope', _args());
    }
  }

  @override
  void dispose() {
    _channel?.setMethodCallHandler(null);
    super.dispose();
  }

  Map<String, Object?> _args() => {
        'envelopeJson': widget.envelopeJson,
        'instanceId': widget.instanceId,
        'snapshotJson': widget.snapshot?.json,
        'colorScheme': _scheme,
      };

  void _created(int id) {
    final channel = MethodChannel('dev.prism/widget_$id');
    channel.setMethodCallHandler(_onCall);
    _channel = channel;
    _sentScheme = _scheme;
  }

  Future<void> _onCall(MethodCall call) async {
    if (!mounted) return;
    switch (call.method) {
      case 'height':
        final h = (call.arguments as num).toDouble();
        if ((h - _height).abs() > 0.25) setState(() => _height = h);
      case 'effect':
        final args = call.arguments as Map;
        widget.onEffect?.call(PrismEffect.from(args['type'] as String, args['value'] as String));
      case 'snapshot':
        final snap = PrismSnapshot.fromJson(call.arguments as String);
        if (snap != null) widget.onSnapshot?.call(snap);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = _scheme;
    if (_channel != null && scheme != _sentScheme) {
      _sentScheme = scheme;
      _channel!.invokeMethod<void>('setColorScheme', scheme);
    }
    // Never 0 tall: some platforms skip a platform view with no size, and the native view
    // only reports its height once it is on screen.
    return SizedBox(
      height: _height < 1 ? 1 : _height,
      child: _platformView(),
    );
  }

  Widget _platformView() {
    final params = _args();
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return UiKitView(
          viewType: _viewType,
          creationParams: params,
          creationParamsCodec: const StandardMessageCodec(),
          gestureRecognizers: _gestures,
          onPlatformViewCreated: _created,
        );
      case TargetPlatform.android:
        // Hybrid composition: the real Android view is in the window, so text fields, the
        // keyboard and accessibility behave like in a native app.
        return PlatformViewLink(
          viewType: _viewType,
          surfaceFactory: (context, controller) => AndroidViewSurface(
            controller: controller as AndroidViewController,
            gestureRecognizers: _gestures,
            hitTestBehavior: PlatformViewHitTestBehavior.opaque,
          ),
          onCreatePlatformView: (p) {
            final controller = PlatformViewsService.initExpensiveAndroidView(
              id: p.id,
              viewType: _viewType,
              layoutDirection: Directionality.of(context),
              creationParams: params,
              creationParamsCodec: const StandardMessageCodec(),
              onFocus: () => p.onFocusChanged(true),
            );
            controller
              ..addOnPlatformViewCreatedListener(p.onPlatformViewCreated)
              ..addOnPlatformViewCreatedListener(_created)
              ..create();
            return controller;
          },
        );
      default:
        return const Center(child: Text('Prism: only iOS and Android are supported'));
    }
  }
}
