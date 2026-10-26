import 'package:flutter/material.dart';

void main() {
  runApp(const PrismClientApp());
}

class PrismClientApp extends StatelessWidget {
  const PrismClientApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      title: 'Prism',
      home: Scaffold(body: Center(child: Text('Prism'))),
    );
  }
}
