package com.weldrite.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.weldrite.app.core.AppContainer
import com.weldrite.app.core.Config
import com.weldrite.app.fcm.NotificationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class WeldriteApp : Application() {

    lateinit var container: AppContainer
        private set

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        createNotificationChannel()

        // Offline-first: seed Room from the bundled asset, then refresh from live API.
        appScope.launch {
            runCatching { container.repository.seedIfNeeded() }
            if (Config.ENABLE_LIVE_REFRESH) {
                runCatching { container.repository.refresh() }
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NotificationHelper.CHANNEL_ID,
                getString(R.string.fcm_default_channel),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply { description = "New products, distributor offers and company announcements" }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
