pluginManagement {
    val flutterSdkPath =
        run {
            val properties = java.util.Properties()
            file("local.properties").inputStream().use { properties.load(it) }
            val flutterSdkPath = properties.getProperty("flutter.sdk")
            require(flutterSdkPath != null) { "flutter.sdk not set in local.properties" }
            flutterSdkPath
        }

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    id("com.android.application") version "9.1.0" apply false
    id("org.jetbrains.kotlin.android") version "2.4.0" apply false
    // The Prism Android wrapper uses Compose (for its Compose API).
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.0" apply false
}

include(":app")

// The Prism Android wrapper, by path (adds :prism and :prism-valdi). The prism_flutter plugin
// depends on :prism.
apply(from = "../../../android/prism-include.gradle")
