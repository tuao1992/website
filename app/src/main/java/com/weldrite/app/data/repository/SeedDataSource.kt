package com.weldrite.app.data.repository

import android.content.Context
import com.google.gson.Gson
import com.weldrite.app.core.Config
import com.weldrite.app.data.model.AppContent
import com.weldrite.app.data.remote.dto.SeedDto
import com.weldrite.app.data.remote.dto.toDomain

/**
 * Reads the bundled assets/app_data.json seed (real Weldrite content) so the app
 * launches instantly with full data even with no network — offline-first.
 */
class SeedDataSource(private val context: Context) {

    private val gson = Gson()
    @Volatile private var cached: AppContent? = null

    fun load(): AppContent = cached ?: synchronized(this) {
        cached ?: run {
            val json = context.assets.open(Config.SEED_ASSET)
                .bufferedReader(Charsets.UTF_8)
                .use { it.readText() }
            val dto = gson.fromJson(json, SeedDto::class.java)
            dto.toDomain().also { cached = it }
        }
    }
}
