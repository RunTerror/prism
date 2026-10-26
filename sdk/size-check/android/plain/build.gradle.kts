plugins { id("com.android.application") }

android {
    namespace = "dev.prism.size.plain"
    compileSdk = 36
    defaultConfig {
        applicationId = "dev.prism.size.plain"
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
