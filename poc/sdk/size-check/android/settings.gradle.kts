pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "prism-size-check"
include(":plain", ":withprism")
// The Prism Android wrapper, by path (adds :prism and :prism-valdi).
apply(from = "../../android/prism-include.gradle")
