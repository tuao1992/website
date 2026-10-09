package com.weldrite.app.ui.screens.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.WeldriteApp
import androidx.datastore.preferences.core.edit
import com.weldrite.app.core.SettingsKeys
import com.weldrite.app.core.settingsDataStore
import com.weldrite.app.data.repository.FileDownloader
import com.weldrite.app.data.repository.WeldriteRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    app: Application,
    private val repo: WeldriteRepository,
    private val downloader: FileDownloader,
) : AndroidViewModel(app) {

    private val dataStore = app.settingsDataStore

    val notificationsEnabled: StateFlow<Boolean> = dataStore.data
        .map { it[SettingsKeys.NOTIFICATIONS] ?: true }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), true)

    fun setNotifications(enabled: Boolean) {
        viewModelScope.launch {
            dataStore.edit { it[SettingsKeys.NOTIFICATIONS] = enabled }
        }
    }

    fun refreshCatalog(onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            val result = repo.refresh()
            onDone(result.isSuccess)
        }
    }

    fun clearDownloads(onDone: (Int) -> Unit) {
        viewModelScope.launch {
            val dir = downloader.downloadsDir()
            val count = dir.listFiles()?.count { it.delete() } ?: 0
            onDone(count)
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[APPLICATION_KEY] as WeldriteApp
                SettingsViewModel(app, app.container.repository, app.container.fileDownloader)
            }
        }
    }
}
