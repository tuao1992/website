package com.weldrite.app.core

import android.text.Html
import com.weldrite.app.data.model.Packaging

/**
 * Lightweight HTML helpers used when refreshing products live from the
 * WooCommerce Store API (which returns rendered HTML for descriptions).
 * The bundled seed is already cleaned, so these only run on live refresh.
 */
object HtmlUtil {

    fun clean(html: String?): String {
        if (html.isNullOrBlank()) return ""
        val normalized = html
            .replace(Regex("(?is)<(script|style)[^>]*>.*?</\\1>"), "")
            .replace(Regex("(?i)<br\\s*/?>"), "\n")
            .replace(Regex("(?i)</(p|li|tr|div|h\\d)>"), "\n")
        @Suppress("DEPRECATION")
        val text = Html.fromHtml(normalized, Html.FROM_HTML_MODE_LEGACY).toString()
        return text
            .replace(Regex("[ \\t]+"), " ")
            .replace(Regex("\\n\\s*\\n+"), "\n")
            .trim()
    }

    /** Split a product short-description into individual benefit bullet lines. */
    fun parseBenefits(shortHtml: String?): List<String> {
        val txt = clean(shortHtml).replace(Regex("(?i)^description:?"), "").trim()
        return txt.split("\n")
            .map { it.trim(' ', '.', '-', '•', '\t') }
            .filter { it.length > 2 }
            .take(8)
    }

    /** Extract Size / Inner Carton / Master Carton rows from a packaging table. */
    fun parsePackaging(descHtml: String?): List<Packaging> {
        val txt = clean(descHtml)
        val regex = Regex("(\\d+\\s?ml[^\\d\\n]*|\\d+\\s?(?:gm|gram|kg|g|L|ltr)[^\\d\\n]*)\\s+(\\d+)\\s+(\\d+)")
        return regex.findAll(txt).map {
            Packaging(it.groupValues[1].trim(), it.groupValues[2], it.groupValues[3])
        }.toList()
    }
}
