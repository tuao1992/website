package com.weldrite.app.data.remote

import com.weldrite.app.BuildConfig
import com.weldrite.app.core.Config
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Builds the OkHttp + Retrofit stack (Phase 12 – secure API calls).
 *
 * Security features:
 *  - HTTPS-only (enforced by network_security_config.xml)
 *  - Optional certificate pinning, gated behind [Config.SSL_PINNING_ENABLED]
 *  - Logging only on debug builds (no request leakage in release)
 */
object NetworkModule {

    fun okHttpClient(): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(Config.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(Config.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)

        if (BuildConfig.DEBUG) {
            builder.addInterceptor(
                HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
            )
        }

        if (Config.SSL_PINNING_ENABLED && Config.SSL_PINS.isNotEmpty()) {
            val pinner = CertificatePinner.Builder().apply {
                Config.SSL_PINS.forEach { pin -> add(Config.PIN_HOST, pin) }
            }.build()
            builder.certificatePinner(pinner)
        }

        return builder.build()
    }

    fun retrofit(client: OkHttpClient = okHttpClient()): Retrofit = Retrofit.Builder()
        .baseUrl(Config.BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    fun api(): WeldriteApi = retrofit().create(WeldriteApi::class.java)
}
