plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "dev.prism.client"
    compileSdk = 36
    defaultConfig {
        applicationId = "dev.prism.client"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1"
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // libprism_sdk.so must be extracted on install (Valdi loads it with System.loadLibrary).
    packaging { jniLibs { useLegacyPackaging = true } }
    // examples.json (+ the small runtime/catalog files next to it) straight from core/dist.
    sourceSets.getByName("main").assets.srcDir(file("../../core/dist"))
}

dependencies {
    implementation(project(":prism"))
    implementation(platform("androidx.compose:compose-bom:2026.06.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.12.4")
}
