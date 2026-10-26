plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.plugin.compose")
    `maven-publish`
}

android {
    namespace = "dev.prism.android"
    compileSdk = 36
    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }
    buildFeatures { compose = true }
    publishing { singleVariant("release") { withSourcesJar(); withJavadocJar() } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions { jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 }
}

// Release: io.github.runterror:prism-android in a Maven repository (scripts/package-release.sh). Its POM lists
// io.github.runterror:prism-valdi and the androidx libraries below, so apps get everything from one line.
publishing {
    publications.create<MavenPublication>("release") {
        groupId = (findProperty("prismGroup") as String?) ?: "io.github.runterror"
        artifactId = "prism-android"
        version = (findProperty("prismVersion") as String?) ?: "0.1.0"
        afterEvaluate { from(components["release"]) }
        pom {
            name.set("Prism for Android")
            description.set("Prism for Android: AI-written screens drawn natively. PrismWidgetView (Views) and PrismWidget (Compose).")
            url.set("https://github.com/RunTerror/prism")
            licenses { license { name.set("Apache-2.0"); url.set("https://www.apache.org/licenses/LICENSE-2.0") } }
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

dependencies {
    // Valdi runtime + Prism drawer (dist/android/prism_sdk.aar), through the :prism-valdi project.
    api(project(":prism-valdi"))
    // What the aar references but does not bundle.
    api("androidx.appcompat:appcompat:1.7.1")
    api("androidx.dynamicanimation:dynamicanimation:1.1.0")
    api("androidx.lifecycle:lifecycle-process:2.9.4")
    api("androidx.lifecycle:lifecycle-runtime:2.9.4")
    // The drawer's controls are Material 3 (MaterialButton, MaterialSwitch, Slider, ...).
    api("com.google.android.material:material:1.12.0")

    // api: apps get the versions too (needed when the app itself does not use Compose).
    api(platform("androidx.compose:compose-bom:2026.06.00"))
    api("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
}
