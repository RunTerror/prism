plugins { id("com.android.application") }

android {
    namespace = "dev.prism.size.withprism"
    compileSdk = 36
    defaultConfig {
        applicationId = "dev.prism.size.withprism"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1"
        ndk { abiFilters += "arm64-v8a" }   // what a modern phone downloads (Play splits by CPU type)
    }
    buildTypes {
        release { isMinifyEnabled = true; isShrinkResources = true }   // like a real release
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    packaging { jniLibs { useLegacyPackaging = true } }
}
dependencies {
    implementation(project(":prism"))
    // The wrapper also has a Compose API, so it needs the Compose versions (BOM) even in a Views app.
    implementation(platform("androidx.compose:compose-bom:2026.06.00"))
}
