pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "prism-android-sdk"

// Same script other builds (demo app, Flutter plugin, React Native module) apply.
apply(from = "prism-include.gradle")
