package com.weldrite.app.ui.screens.downloads

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.core.container
import com.weldrite.app.data.model.DownloadItem
import com.weldrite.app.data.repository.DownloadProgress
import com.weldrite.app.data.repository.FileDownloader
import com.weldrite.app.data.repository.WeldriteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

/** Per-item download status for the UI. */
sealed interface DlStatus {
    data object NotDownloaded : DlStatus
    data class InProgress(val percent: Int) : DlStatus
    data class Downloaded(val file: File) : DlStatus
    data class Error(val message: String) : DlStatus
}

class DownloadsViewModel(
    repo: WeldriteRepository,
    private val downloader: FileDownloader,
) : ViewModel() {

    val downloads: StateFlow<List<DownloadItem>> =
        repo.observeDownloads().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _statuses = MutableStateFlow<Map<String, DlStatus>>(emptyMap())
    val statuses: StateFlow<Map<String, DlStatus>> = _statuses

    fun statusFor(item: DownloadItem): DlStatus =
        _statuses.value[item.url] ?: run {
            if (downloader.isDownloaded(item.url)) DlStatus.Downloaded(downloader.fileFor(item.url))
            else DlStatus.NotDownloaded
        }

    fun download(item: DownloadItem) {
        viewModelScope.launch {
            downloader.download(item.url).collect { progress ->
                val status = when (progress) {
                    is DownloadProgress.Downloading -> DlStatus.InProgress(progress.percent)
                    is DownloadProgress.Done -> DlStatus.Downloaded(progress.file)
                    is DownloadProgress.Failed -> DlStatus.Error(progress.message)
                }
                _statuses.value = _statuses.value + (item.url to status)
            }
        }
    }

    fun fileFor(item: DownloadItem): File = downloader.fileFor(item.url)

    companion object {
        val Factory = viewModelFactory {
            initializer { DownloadsViewModel(container.repository, container.fileDownloader) }
        }
    }
}
