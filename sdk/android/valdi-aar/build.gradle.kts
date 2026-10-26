// Exposes the Valdi export (sdk/dist/android/prism_sdk.aar) as a project dependency.
//
// AGP refuses `implementation(files("x.aar"))` inside a library module that itself builds an aar
// ("Direct local .aar file dependencies are not supported when building an AAR"). A project with
// no plugins whose `default` configuration carries the aar file is resolved by Gradle's legacy
// fallback and AGP then treats the file like any other aar dependency. No copy, no Maven repo.
//
// The aar does not bundle its own dependencies; :prism declares them (see prism/build.gradle.kts).
val aar = file("../../dist/android/prism_sdk.aar")
if (!aar.exists()) {
    logger.warn("Prism: $aar is missing - run sdk/scripts/build-sdk.sh")
}
configurations.maybeCreate("default")
artifacts.add("default", aar)

/** A jar holding only a README that points to the sources on GitHub. */
fun placeholderJar(kind: String): TaskProvider<Jar> = tasks.register<Jar>("${kind}Jar") {
    archiveClassifier.set(kind)
    archiveBaseName.set("prism-valdi")
    destinationDirectory.set(layout.buildDirectory.dir("placeholder-jars"))
    val note = layout.buildDirectory.file("placeholder/$kind/README.md")
    doFirst { note.get().asFile.apply { parentFile.mkdirs(); writeText("Prism Valdi drawer: the source is in https://github.com/RunTerror/prism (sdk/modules).\n") } }
    from(layout.buildDirectory.dir("placeholder/$kind"))
}

// Release: the aar as io.github.runterror:prism-valdi in a Maven repository (scripts/package-release.sh).
plugins.apply("maven-publish")
extensions.configure<PublishingExtension> {
    publications.create<MavenPublication>("aar") {
        groupId = (findProperty("prismGroup") as String?) ?: "io.github.runterror"
        artifactId = "prism-valdi"
        version = (findProperty("prismVersion") as String?) ?: "0.1.0"
        artifact(aar) { extension = "aar" }
        // Maven Central wants a sources and a docs jar next to every package. This one is a
        // prebuilt drawer (its source is sdk/modules), so both are short placeholders.
        artifact(placeholderJar("sources")) { classifier = "sources" }
        artifact(placeholderJar("javadoc")) { classifier = "javadoc" }
        pom {
            packaging = "aar"
            name.set("Prism Valdi drawer")
            description.set("The Prism drawer, built with Valdi: draws Prism screens with native Android views. Used by prism-android.")
            url.set("https://github.com/RunTerror/prism")
            licenses { 
                license { name.set("Apache-2.0"); url.set("https://www.apache.org/licenses/LICENSE-2.0") }
                license { name.set("MIT (Valdi)"); url.set("https://github.com/Snapchat/Valdi/blob/main/LICENSE.md") }
             }
            developers { developer { id.set("RunTerror"); name.set("Abhishek Bansal"); email.set("bansalabhishek7411@gmail.com") } }
            scm {
                url.set("https://github.com/RunTerror/prism")
                connection.set("scm:git:https://github.com/RunTerror/prism.git")
                developerConnection.set("scm:git:ssh://git@github.com/RunTerror/prism.git")
            }
        }
    }
    (findProperty("prismRepo") as String?)?.let { repo -> repositories.maven { url = uri(repo) } }
}
