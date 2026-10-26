import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:prism_flutter/prism_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  Prism.start(); // optional: warms up the native runtime
  runApp(const DemoApp());
}

/// One example from core/dist/examples.json.
class Example {
  Example(this.id, this.title, this.source, this.envelopeJson);
  final String id;
  final String title;
  final String source;
  final String envelopeJson;

  static Future<List<Example>> load() async {
    final list = jsonDecode(await rootBundle.loadString('assets/examples.json')) as List;
    return [
      for (final e in list.cast<Map<String, dynamic>>())
        Example(e['id'] as String, e['title'] as String, e['source'] as String, jsonEncode(e['envelope'])),
    ];
  }
}

/// `--dart-define=START=03-tasks` opens that example at launch, `START=feed` the Feed tab
/// (handy for screenshots).
const start = String.fromEnvironment('START');

/// Last snapshot per example: a widget made again (back to a page, scrolled back in the feed)
/// comes back instantly, as the user left it.
final snapshots = <String, PrismSnapshot>{};

class DemoApp extends StatefulWidget {
  const DemoApp({super.key});

  @override
  State<DemoApp> createState() => _DemoAppState();
}

class _DemoAppState extends State<DemoApp> {
  ThemeMode mode = ThemeMode.system;
  late final Future<List<Example>> examples = Example.load();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Prism Flutter',
      themeMode: mode,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF4F46E5)),
      darkTheme: ThemeData(colorSchemeSeed: const Color(0xFF818CF8), brightness: Brightness.dark),
      home: FutureBuilder(
        future: examples,
        builder: (context, snap) => snap.hasData
            ? Home(
                examples: snap.data!,
                mode: mode,
                onMode: (m) => setState(() => mode = m),
              )
            : const Scaffold(body: Center(child: CircularProgressIndicator())),
      ),
    );
  }
}

class Home extends StatefulWidget {
  const Home({super.key, required this.examples, required this.mode, required this.onMode});
  final List<Example> examples;
  final ThemeMode mode;
  final ValueChanged<ThemeMode> onMode;

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  int tab = start == 'feed' ? 1 : 0;

  @override
  void initState() {
    super.initState();
    final first = widget.examples.where((e) => e.id == start).firstOrNull;
    if (first != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ExamplePage(example: first)),
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(tab == 0 ? 'Prism examples' : 'Feed'),
        actions: [
          PopupMenuButton<ThemeMode>(
            icon: const Icon(Icons.brightness_6),
            initialValue: widget.mode,
            onSelected: widget.onMode,
            itemBuilder: (_) => const [
              PopupMenuItem(value: ThemeMode.system, child: Text('System')),
              PopupMenuItem(value: ThemeMode.light, child: Text('Light')),
              PopupMenuItem(value: ThemeMode.dark, child: Text('Dark')),
            ],
          ),
        ],
      ),
      body: tab == 0 ? Gallery(examples: widget.examples) : Feed(examples: widget.examples),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (i) => setState(() => tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.list), label: 'Gallery'),
          NavigationDestination(icon: Icon(Icons.view_stream), label: 'Feed'),
        ],
      ),
    );
  }
}

/// A list of examples; tap one to open it on its own page.
class Gallery extends StatelessWidget {
  const Gallery({super.key, required this.examples});
  final List<Example> examples;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        for (final e in examples)
          ListTile(
            title: Text(e.title),
            subtitle: Text(e.id),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => ExamplePage(example: e)),
            ),
          ),
      ],
    );
  }
}

/// One example in a scroll view, with Flutter text right below it (it moves if the height changes).
class ExamplePage extends StatefulWidget {
  const ExamplePage({super.key, required this.example});
  final Example example;

  @override
  State<ExamplePage> createState() => _ExamplePageState();
}

class _ExamplePageState extends State<ExamplePage> {
  bool showSource = false;

  @override
  Widget build(BuildContext context) {
    final e = widget.example;
    return Scaffold(
      appBar: AppBar(
        title: Text(e.title),
        actions: [
          TextButton(
            onPressed: () => setState(() => showSource = !showSource),
            child: Text(showSource ? 'Hide source' : 'Source'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PrismWidget(
            envelopeJson: e.envelopeJson,
            instanceId: 'page/${e.id}',
            snapshot: snapshots[e.id],
            onEffect: (effect) => handleEffect(context, effect),
            onSnapshot: (s) => snapshots[e.id] = s,
          ),
          const SizedBox(height: 12),
          Text(
            'This Flutter text sits right below the native widget. If it moves when the widget grows, auto height works.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (showSource) ...[
            const SizedBox(height: 12),
            SelectableText(e.source, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
          ],
        ],
      ),
    );
  }
}

/// Every example in one lazy list, like a chat: widgets are made and dropped while scrolling.
class Feed extends StatelessWidget {
  const Feed({super.key, required this.examples});
  final List<Example> examples;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: examples.length,
      separatorBuilder: (_, _) => const SizedBox(height: 24),
      itemBuilder: (context, i) {
        final e = examples[i];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(e.title, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            PrismWidget(
              key: ValueKey('feed/${e.id}'),
              envelopeJson: e.envelopeJson,
              instanceId: 'feed/${e.id}',
              snapshot: snapshots['feed/${e.id}'],
              onEffect: (effect) => handleEffect(context, effect),
              onSnapshot: (s) => snapshots['feed/${e.id}'] = s,
            ),
          ],
        );
      },
    );
  }
}

void handleEffect(BuildContext context, PrismEffect effect) {
  final message = switch (effect) {
    PrismToast(:final text) => text,
    PrismOpen(:final url) => 'Open $url',
    PrismCopy(:final text) => 'Copied: $text',
    PrismAsk(:final text) => 'Ask: $text',
    PrismAction(:final name) => 'The app would now run “$name”',
    PrismOtherEffect(:final type, :final value) => '$type: $value',
  };
  if (effect is PrismCopy) Clipboard.setData(ClipboardData(text: effect.text));
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
