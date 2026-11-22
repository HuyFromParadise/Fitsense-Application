# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in Android SDK proguard-android-optimize.txt.

# Preserve FitSense native modules, Room entities/database, Workers & Receivers
-keep class com.fitsensemobile.** { *; }
-keepclassmembers class com.fitsensemobile.** { *; }

# Keep @ReactMethod reflective signatures used by React Native bridge
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod public *;
}
