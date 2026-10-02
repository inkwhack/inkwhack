# Weight Tracker

A simple offline weight tracker inspired by the supplied blue-and-white mobile screenshots. No accounts, analytics, API or remote storage. Starts empty; example readings are not treated as your data.

## Website

Run `npm start`, then open http://localhost:5173. No dependencies are required. Serve the root web files on HTTPS to install on phones (localhost also supports offline development). Android Chrome: Install app / Add to Home screen. iPhone Safari: Share → Add to Home Screen. Service worker caches the app after the first successful visit.

Home shows current weight, total and weekly changes, BMI and an estimated adult BMI weight range. Readings are grouped by month and can be edited or deleted. Graph plots actual dates. Profile supports pounds/kilograms and centimetres/feet and inches. Body fat, fasting and notes are optional. Data remains in localStorage; changing units preserves the original weights. Settings exports/imports a JSON backup. Website and APK data are separate, and backups can transfer between them.

## Android APK

Android source lives in `android/`. It packages the same website locally with Android WebView. No Internet permission is requested and Android cloud backup is disabled. Backup export/import uses Android's document picker; choose local device storage if you want backups to remain local.

Requires Java 17, Android SDK 35 and Gradle 8.9. Run `npm run android:assets`, then `gradle -p android assembleDebug`. The installable test APK is `android/app/build/outputs/apk/debug/app-debug.apk`. It is signed with a debug key, suitable for personal testing, not a Play Store release.

The included GitHub Actions workflow builds and uploads `Weight-Tracker-APK` when pushed to GitHub or manually triggered. Download the artifact, unzip it, and open the APK on Android. A production release should use your own stable signing key to preserve updates.

## Validation

Run `npm test`. Tests cover unit conversion, chronological statistics, one-reading behaviour, and backup validation. Android compilation requires the tools above; source alone does not confirm a successful APK build.
