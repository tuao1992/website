package com.weldrite.app.core

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore

/** App-wide preferences backed by Jetpack DataStore. */
val Context.settingsDataStore by preferencesDataStore(name = "weldrite_settings")

object SettingsKeys {
    val NOTIFICATIONS = booleanPreferencesKey("notifications_enabled")
}
