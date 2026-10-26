/// Prism for Flutter: draws Prism screens with the native Prism SDK (Valdi) on iOS and Android.
///
/// The screen is not drawn by Flutter. Each [PrismWidget] is a native view (UIKit on iOS,
/// Android Views on Android) shown inside the Flutter tree, the same view the Swift and Kotlin
/// wrappers give native apps.
library;

export 'src/prism.dart';
export 'src/prism_effect.dart';
export 'src/prism_snapshot.dart';
export 'src/prism_versions.dart';
export 'src/prism_widget.dart';
