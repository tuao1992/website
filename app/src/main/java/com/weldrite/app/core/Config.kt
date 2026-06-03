package com.weldrite.app.core

/**
 * Centralized configuration for the Weldrite app (Phase 10 – Admin Configuration).
 *
 * Every outward-facing URL, API endpoint and feature flag lives here so the app
 * can be re-pointed at a different backend, brochure set or contact channel
 * without touching the rest of the codebase.
 */
object Config {

    /** Base website / brand. */
    const val WEBSITE_URL = "https://weldrite.in"
    const val BASE_URL = "https://weldrite.in/"

    /** WooCommerce Store API (public, read-only) used to refresh products live. */
    const val WC_STORE_API = "wp-json/wc/store/v1/"
    const val WP_API = "wp-json/wp/v2/"

    /** Bundled seed data shipped in assets/ — used for instant, offline-first launch. */
    const val SEED_ASSET = "app_data.json"

    /** Primary contact channels (overridable from remote company config). */
    const val SUPPORT_PHONE = "+917498911130"
    const val SUPPORT_WHATSAPP = "917498911130"
    const val SUPPORT_EMAIL = "info@sindhucon.com"

    /** Networking. */
    const val CONNECT_TIMEOUT_SECONDS = 20L
    const val READ_TIMEOUT_SECONDS = 30L
    const val PAGE_SIZE = 20

    /** Hero banner auto-scroll interval (ms). */
    const val HERO_AUTOSCROLL_MS = 4000L

    /** Cache freshness window — refresh from network if the cache is older than this. */
    const val CACHE_TTL_MS = 6 * 60 * 60 * 1000L // 6 hours

    /**
     * SSL / certificate pinning (Phase 12 – Security).
     *
     * Pinning is implemented in [com.weldrite.app.data.remote.NetworkModule] but is
     * disabled by default: the production SPKI pin must be captured from a direct
     * (non-proxied) connection to weldrite.in and placed in [SSL_PINS] before
     * enabling, otherwise legitimate traffic would be rejected. Compute with:
     *
     *   echo | openssl s_client -servername weldrite.in -connect weldrite.in:443 \
     *     | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der \
     *     | openssl dgst -sha256 -binary | openssl enc -base64
     */
    const val SSL_PINNING_ENABLED = false
    const val PIN_HOST = "weldrite.in"
    val SSL_PINS = listOf<String>(
        // "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", // leaf
        // "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=", // intermediate (backup)
    )

    /** Feature flags. */
    const val ENABLE_LIVE_REFRESH = true
    const val ENABLE_PUSH = true
}
