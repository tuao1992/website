package com.weldrite.app.data.repository

import android.content.Context
import com.weldrite.app.data.remote.NetworkModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

/** Progress states emitted while downloading a file (Phase 8 – Download Manager). */
sealed interface DownloadProgress {
    data class Downloading(val percent: Int) : DownloadProgress
    data class Done(val file: File) : DownloadProgress
    data class Failed(val message: String) : DownloadProgress
}

/**
 * Streams a remote file (brochure / catalogue PDF) into the app's external files
 * directory, emitting progress so the UI can show a determinate indicator.
 * Downloaded files persist for offline access.
 */
class FileDownloader(
    private val context: Context,
    private val client: OkHttpClient = NetworkModule.okHttpClient(),
) {
    fun downloadsDir(): File =
        File(context.getExternalFilesDir(null), "downloads").apply { mkdirs() }

    fun fileFor(url: String): File {
        val name = url.substringAfterLast('/').substringBefore('?').ifBlank { "download.pdf" }
        return File(downloadsDir(), name)
    }

    fun isDownloaded(url: String): Boolean = fileFor(url).let { it.exists() && it.length() > 0 }

    fun download(url: String): Flow<DownloadProgress> = flow {
        val target = fileFor(url)
        if (target.exists() && target.length() > 0) {
            emit(DownloadProgress.Done(target)); return@flow
        }
        val tmp = File(target.absolutePath + ".part")
        val response = client.newCall(Request.Builder().url(url).build()).execute()
        if (!response.isSuccessful) {
            emit(DownloadProgress.Failed("HTTP ${response.code}")); return@flow
        }
        val body = response.body ?: run {
            emit(DownloadProgress.Failed("Empty response")); return@flow
        }
        val total = body.contentLength()
        body.byteStream().use { input ->
            tmp.outputStream().use { output ->
                val buffer = ByteArray(8 * 1024)
                var read: Int
                var downloaded = 0L
                var lastPct = -1
                while (input.read(buffer).also { read = it } != -1) {
                    output.write(buffer, 0, read)
                    downloaded += read
                    if (total > 0) {
                        val pct = ((downloaded * 100) / total).toInt()
                        if (pct != lastPct) { lastPct = pct; emit(DownloadProgress.Downloading(pct)) }
                    }
                }
            }
        }
        if (tmp.renameTo(target)) emit(DownloadProgress.Done(target))
        else emit(DownloadProgress.Failed("Could not save file"))
    }.flowOn(Dispatchers.IO)
}
