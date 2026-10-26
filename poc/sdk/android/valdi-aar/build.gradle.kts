// Exposes the Valdi export (poc/sdk/dist/android/prism_sdk.aar) as a project dependency.
//
// AGP refuses `implementation(files("x.aar"))` inside a library module that itself builds an aar
// ("Direct local .aar file dependencies are not supported when building an AAR"). A project with
// no plugins whose `default` configuration carries the aar file is resolved by Gradle's legacy
// fallback and AGP then treats the file like any other aar dependency. No copy, no Maven repo.
//
// The aar does not bundle its own dependencies; :prism declares them (see prism/build.gradle.kts).
val aar = file("../../dist/android/prism_sdk.aar")
if (!aar.exists()) {
    logger.warn("Prism: $aar is missing - run poc/sdk/scripts/build-sdk.sh")
}
configurations.maybeCreate("default")
artifacts.add("default", aar)

// Release: the aar as io.github.runterror:prism-valdi in a Maven repository (scripts/package-release.sh).
plugins.apply("maven-publish")
extensions.configure<PublishingExtension> {
    publications.create<MavenPublication>("aar") {
        groupId = (findProperty("prismGroup") as String?) ?: "io.github.runterror"
        artifactId = "prism-valdi"
        version = (findProperty("prismVersion") as String?) ?: "0.1.0"
        artifact(aar) { extension = "aar" }
        pom { packaging = "aar"; name.set("Prism Valdi drawer"); licenses { license { name.set("MIT (Valdi) + Apache-2.0 (Prism)") } } }
    }
    (findProperty("prismRepo") as String?)?.let { repo -> repositories.maven { url = uri(repo) } }
}
