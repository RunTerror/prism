pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "prism-host-demo"
include(":app")

// The Prism Android wrapper, by path (adds :prism and :prism-valdi).
apply(from = "../../android/prism-include.gradle")
