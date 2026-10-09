# Build Instructions — Weldrite Android App

## Prerequisites
| Tool | Version |
|---|---|
| JDK | 17 – 21 |
| Android SDK | Platform **35**, Build-Tools **35.0.0** |
| Gradle | Wrapper pins **8.14.3** (auto-downloaded) |
| Android Studio | Ladybug (2024.2) or newer — *optional*, CLI works too |

The Android Gradle Plugin will auto-install any missing SDK components on first build.

## 1. Configure the SDK location
Create `local.properties` in the project root (already present in this repo; update the path
for your machine):
```properties
sdk.dir=/path/to/your/Android/sdk
```
Or export `ANDROID_HOME=/path/to/sdk`.

## 2. Build a Debug APK
```bash
./gradlew :app:assembleDebug
```
Output: `app/build/outputs/apk/debug/app-debug.apk`

## 3. Build a signed Release APK
A sample keystore (`weldrite-release.keystore`) and `keystore.properties` are included so the
release build is reproducible out of the box:
```properties
# keystore.properties
storeFile=weldrite-release.keystore
storePassword=weldrite2026
keyAlias=weldrite
keyPassword=weldrite2026
```
Build:
```bash
./gradlew :app:assembleRelease
```
Output (minified, R8-obfuscated, signed): `app/build/outputs/apk/release/app-release.apk`

> ⚠️ The sample keystore is for demonstration / reproducible builds only. **Generate your own
> keystore and keep it secret** before publishing to Google Play:
> ```bash
> keytool -genkeypair -v -keystore my-release.keystore -alias mykey \
>   -keyalg RSA -keysize 2048 -validity 10000
> ```
> Then point `keystore.properties` at it.

## 4. Build everything
```bash
./gradlew clean :app:assembleDebug :app:assembleRelease
```

## 5. Run the unit tests
```bash
./gradlew :app:testDebugUnitTest
```
Covers the product HTML parser and checks that the bundled seed matches what the app's live
refresh produces (see README › Refreshing the bundled content).

## 6. Install on a device
```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Open in Android Studio
`File → Open…` → select the project root. Let Gradle sync, then Run ▶.

## Useful tasks
| Task | Purpose |
|---|---|
| `./gradlew lint` | Android lint report |
| `./gradlew :app:dependencies` | Dependency tree |
| `./gradlew clean` | Remove build outputs |

## Notes
- **minSdk 24** (Android 7.0) → **targetSdk 35** (Android 15).
- First build downloads dependencies and may take several minutes.
- No secrets/keys are required to build the debug variant.
- To activate Firebase Cloud Messaging, drop `google-services.json` into `app/` and apply the
  Google Services Gradle plugin (see README › Enabling Push Notifications).
