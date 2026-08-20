# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor — WebView ve eklenti köprüleri korunmalı.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase — yansıma kullanır, R8 silmesin.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# AdMob
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# Crashlytics hata ayıklama bilgisi
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Supabase JS SDK WebView'da çalışır; Java tarafı yok.
# Capacitor eklentileri zaten yukarıdaki genel keep ile korunuyor.
