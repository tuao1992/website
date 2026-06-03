# Weldrite — Android App

A production-ready native Android application that is a feature-for-feature replica of
**[weldrite.in](https://weldrite.in)** (Weldrite Solvent Cement, a brand of *Sindhucon
Products & Services Pvt. Ltd.*), optimised for mobile.

Built with **Kotlin · Jetpack Compose · Material 3 · MVVM · Retrofit · Room · Coil**.

All content (35 products, 11 categories, company info, certifications, contact details,
brochures) is **real**, extracted from weldrite.in's WordPress + WooCommerce REST APIs and
bundled for an offline-first experience, with live refresh when online.

---

## ✨ Features

| Area | What's included |
|---|---|
| **Bottom navigation** | Home · Products · Dealers · Downloads · Contact |
| **Splash** | Branded animated splash (system + in-app) |
| **Home** | Hero banner slider, company stats (17+ yrs, 200+ distributors, Pan India, ISO), category rail, featured & new products, ISO/NSF certification highlight, "Why Choose Us", Contact & Distributor CTAs |
| **Products** | Search, category filter chips, sort (name/category/newest), responsive 2-column grid |
| **Product detail** | Hi-res image, benefits, full description, **packaging spec table**, applications, certifications, related products, **Share**, WhatsApp & **Send Inquiry** |
| **Dealers** | State-wise locator with city search, Call / WhatsApp / Google-Maps directions, Become-a-Distributor CTA |
| **Downloads** | Brochure/catalogue PDFs with a **download manager**, determinate progress, and **offline** open |
| **Contact** | Tabbed inquiry form (General / Product / Distributor) with full validation (required, phone, email); quick Call/WhatsApp/Email/Maps |
| **Distributor** | "Become a Distributor" form (GSTIN, address, state, pincode…) with validation |
| **About / Certifications / Settings / Search** | Full screens, no placeholders |
| **Performance** | Offline-first Room cache, lazy lists/grids, Coil image caching, fast startup |
| **Security** | HTTPS-only network policy, input validation, R8/ProGuard obfuscation, configurable SSL pinning |
| **Push** | Firebase Cloud Messaging service + notification channel (activate with `google-services.json`) |

---

## 🏗 Architecture

Clean **MVVM** with a unidirectional data flow and a lightweight manual DI container.

```
UI (Compose screens)
   └── ViewModel (StateFlow ui-state)
          └── WeldriteRepository  ← single source of truth
                 ├── Room (offline cache + seed)      [local]
                 ├── Retrofit/OkHttp → WooCommerce API [remote]
                 └── SeedDataSource (bundled JSON)     [assets]
```

- **`core/Config.kt`** — centralized URLs, endpoints, feature flags & SSL-pin config (Phase 10).
- **Offline-first** — Room is seeded from `assets/app_data.json` on first launch, then
  refreshed from the live WooCommerce Store API when online.
- **DI** — `core/AppContainer.kt` owns app-scoped singletons; ViewModels are built with
  `viewModelFactory { … }` reading the container from the `Application`.

### Project layout
```
app/src/main/java/com/weldrite/app/
├── core/            Config, AppContainer, intent helpers, HTML utils, settings store
├── data/
│   ├── local/       Room entities, DAOs, converters, database
│   ├── remote/      Retrofit API, DTOs, NetworkModule (OkHttp + optional cert pinning)
│   ├── repository/  WeldriteRepository, SeedDataSource, FileDownloader
│   └── model/       Domain models (Product, Category, Dealer, CompanyInfo…)
├── fcm/             FirebaseMessagingService + NotificationHelper
├── ui/
│   ├── theme/       Material 3 colour scheme (brand maroon/red), typography
│   ├── components/  NetworkImage, ProductCard, FormField, shared UI
│   ├── navigation/  Routes + NavHost + bottom bar
│   └── screens/     home, products, productdetail, dealers, downloads, contact,
│                    about, certifications, distributor, settings, search, splash
├── MainActivity.kt
└── WeldriteApp.kt   Application: DI init, notification channel, seed + refresh
```

---

## 🔧 Tech stack
- Kotlin 2.0 · Gradle Kotlin DSL · version catalog (`gradle/libs.versions.toml`)
- Jetpack Compose (BOM 2024.10) · Material 3
- AndroidX Lifecycle / Navigation-Compose
- Retrofit 2.11 + OkHttp 4.12 + Gson
- Room 2.6 (KSP)
- Coil 2.7
- DataStore Preferences
- Firebase Messaging (BoM 33)
- `compileSdk` / `targetSdk` **35**, `minSdk` **24**

---

## 🚀 Build & run

See **[BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)** for full details. Quick start:

```bash
# Debug APK
./gradlew :app:assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk

# Signed release APK (uses the included sample keystore)
./gradlew :app:assembleRelease
# → app/build/outputs/apk/release/app-release.apk
```

Pre-built APKs are committed under **[`apk/`](apk/)**.

---

## 🔔 Enabling Push Notifications
The FCM code is complete but inactive until you add Firebase config:
1. Create a Firebase project and add an Android app with id `com.weldrite.app`.
2. Download `google-services.json` into `app/`.
3. Add the Google Services plugin (`com.google.gms.google-services`) in `app/build.gradle.kts`
   and the classpath in the root build, then rebuild. `WeldriteMessagingService` handles the rest.

---

## 🔒 Security notes
- Cleartext traffic is disabled (`res/xml/network_security_config.xml`).
- All form input is validated (required / phone / email / pincode).
- Release builds are minified & obfuscated with R8 (`proguard-rules.pro`).
- **SSL pinning** is implemented in `NetworkModule` but **disabled by default** — the real
  production SPKI pin must be captured from a direct connection to weldrite.in and placed in
  `Config.SSL_PINS` before enabling (see `Config.kt`).
- The bundled `weldrite-release.keystore` is a **sample** for reproducible signed builds.
  Replace it with your own secret keystore before publishing to Google Play.

---

## 📄 Data provenance
Real content is fetched from:
- `https://weldrite.in/wp-json/wc/store/v1/products` — products & packaging
- `https://weldrite.in/wp-json/wc/store/v1/products/categories` — categories
- `https://weldrite.in/wp-json/wp/v2/pages/*` — About / Contact copy

See **[SITEMAP.md](SITEMAP.md)** for the full website analysis (Phase 1).
