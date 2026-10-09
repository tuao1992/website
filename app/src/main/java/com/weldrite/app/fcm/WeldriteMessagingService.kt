package com.weldrite.app.fcm

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Receives Firebase Cloud Messaging pushes (Phase 11).
 *
 * Activates automatically once a valid `google-services.json` is added to the
 * app module (see README › Push Notifications). Handles both notification and
 * data messages and routes optional deep-links into the app.
 */
class WeldriteMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title
            ?: message.data["title"]
            ?: "Weldrite"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: return
        val deepLink = message.data["deeplink"] ?: message.data["link"]
        NotificationHelper.show(applicationContext, title, body, deepLink)
    }

    override fun onNewToken(token: String) {
        // Register this token with your backend to target the device.
        Log.d(TAG, "FCM token refreshed")
    }

    companion object {
        private const val TAG = "WeldriteFCM"
    }
}
