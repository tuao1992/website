package com.weldrite.app.core

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File

/** Small wrappers around the system intents used by the Contact & Dealer modules. */
object ContactActions {

    fun dial(context: Context, phone: String) =
        safeStart(context, Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")), "No dialer app found")

    fun whatsapp(context: Context, number: String, message: String = "") {
        val text = Uri.encode(message)
        val uri = Uri.parse("https://wa.me/$number${if (message.isNotBlank()) "?text=$text" else ""}")
        safeStart(context, Intent(Intent.ACTION_VIEW, uri), "WhatsApp is not installed")
    }

    fun email(context: Context, address: String, subject: String = "", body: String = "") {
        val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$address")).apply {
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_TEXT, body)
        }
        safeStart(context, intent, "No email app found")
    }

    fun openMaps(context: Context, query: String, lat: Double? = null, lng: Double? = null) {
        val uri = if (lat != null && lng != null)
            Uri.parse("geo:$lat,$lng?q=${Uri.encode(query)}")
        else
            Uri.parse("geo:0,0?q=${Uri.encode(query)}")
        val intent = Intent(Intent.ACTION_VIEW, uri)
        if (intent.resolveActivity(context.packageManager) == null) {
            // Fall back to the Maps website if no geo handler exists.
            openUrl(context, "https://www.google.com/maps/search/?api=1&query=${Uri.encode(query)}")
        } else {
            safeStart(context, intent, "No maps app found")
        }
    }

    fun openUrl(context: Context, url: String) =
        safeStart(context, Intent(Intent.ACTION_VIEW, Uri.parse(url)), "Could not open link")

    fun share(context: Context, subject: String, text: String) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, subject)
            putExtra(Intent.EXTRA_TEXT, text)
        }
        context.startActivity(Intent.createChooser(intent, "Share via"))
    }

    /** Open a downloaded PDF through the FileProvider. */
    fun openPdf(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        if (intent.resolveActivity(context.packageManager) != null) safeStart(context, intent, "No PDF viewer found")
        else Toast.makeText(context, "Install a PDF viewer to open this file", Toast.LENGTH_LONG).show()
    }

    private fun safeStart(context: Context, intent: Intent, error: String) {
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(context, error, Toast.LENGTH_SHORT).show()
        }
    }
}
