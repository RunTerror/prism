# Prism Flutter demo

A normal Flutter app that shows the Prism examples through `prism_flutter` (`../../flutter`).
Two tabs:

- **Gallery**: tap an example to open it on its own page (Flutter text below shows auto height).
- **Feed**: every example in one lazy `ListView`, like a chat. Snapshots bring widgets back
  instantly when you scroll back.

The light/dark button in the top bar switches the app's theme; the widgets follow.

## Run

```sh
../../scripts/build-sdk.sh            # once: builds the native SDK (dist/)
(cd ../../../core && npm run build)   # once: examples.json (assets/examples.json links to it)
flutter run                            # on an iPhone simulator or Android emulator
```

`--dart-define=START=03-tasks` opens that example at launch; `START=feed` opens the Feed tab
(handy for screenshots). Screenshots in `screenshots/`.

## Checked (2026-10-21)

| | iOS (iPhone 17 simulator, iOS 27) | Android (emulator) |
|---|---|---|
| Native widgets draw inside Flutter | yes | yes |
| Height follows content, Flutter text moves | yes | yes (task added: widget grew) |
| Taps, typing, keyboard | not tested (no tap tool) | yes |
| Effects reach Flutter (snack bar) | not tested | yes |
| Dark mode | not tested | yes |
