package com.weldrite.app.core

import com.weldrite.app.data.model.PackagingTable

/**
 * Parses the product HTML returned by weldrite.in's WooCommerce Store API.
 *
 * Pure Kotlin (no android.text.Html) so the same rules run in JVM unit tests.
 * tools/refresh_content.py ports these rules line-for-line to build the bundled
 * seed, and SeedConsistencyTest fails if the two ever disagree — change both together.
 */
object HtmlUtil {

    /** Headers assumed when a packaging table has no header row. */
    val DEFAULT_HEADERS = listOf("Size", "Inner Carton", "Master Carton")

    private const val MAX_POINTS = 12

    /** A line of visible text; [listItem] is true when it came from an `<li>`. */
    data class Line(val text: String, val listItem: Boolean)

    /** Short description split into benefit bullets and application steps. */
    data class ShortDescription(val text: String, val benefits: List<String>, val usage: List<String>)

    /** Long description: the packaging table plus any genuine prose around it. */
    data class Description(val packaging: PackagingTable, val prose: String)

    private val SCRIPT_STYLE = Regex("""(?is)<(script|style)\b[^>]*>.*?</\1[ \t\r\n\f]*>""")
    private val LI_OPEN = Regex("""(?i)<li\b[^>]*>""")
    private val BREAK = Regex("""(?i)<br\b[^>]*>|</?(?:p|div|ul|ol|li|h[1-6]|tr|table|tbody|thead|tfoot|blockquote)\b[^>]*>""")
    private val TAG = Regex("""(?s)<[^>]*>""")
    private val ENTITY = Regex("""&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);""")
    // Includes U+0085/U+2028/U+2029: Java treats them as line terminators for `.` and `$`,
    // Python does not, so they are folded to spaces before any line-level matching.
    private val SPACE_RUN = Regex("""[ \t\n\r\f\x0B \u0085 -     　]+""")

    private val DESCRIPTION_LABEL = Regex("""(?i)^description *(?::|$) *""")
    private val USAGE_HEADING = Regex("""(?i)^(?:how to (?:apply|use)|directions(?: for use)?|method of (?:application|use)|application method)[ :.\-]*$""")
    private val LABEL = Regex("""^.{1,40}:$""")
    private val BULLET = Regex("""^(?:[•·▪●]+ *|[*\-] +)""")
    private val SPACE_BEFORE_PUNCT = Regex(""" +([,;])""")
    private val TRAILING = Regex("""[ ,;]+$""")

    private val ESCAPED_TABLE = Regex("""(?i)&lt;table\b""")
    private val TABLE = Regex("""(?is)<table\b[^>]*>(.*?)(?:</table[ \t\r\n\f]*>|$)""")
    private val ROW_BOUNDARY = Regex("""(?i)</?tr\b[^>]*>""")
    private val CELL = Regex("""(?is)<t[dh]\b[^>]*>(.*?)(?=</t[dh][ \t\r\n\f]*>|<t[dh]\b|$)""")

    private val NAMED_ENTITIES = mapOf(
        "amp" to "&", "lt" to "<", "gt" to ">", "quot" to "\"", "apos" to "'", "nbsp" to " ",
        "ndash" to "–", "mdash" to "—", "lsquo" to "‘", "rsquo" to "’", "sbquo" to "‚",
        "ldquo" to "“", "rdquo" to "”", "bdquo" to "„", "hellip" to "…", "bull" to "•", "middot" to "·",
        "deg" to "°", "prime" to "′", "Prime" to "″", "times" to "×", "divide" to "÷", "plusmn" to "±",
        "frac12" to "½", "frac14" to "¼", "frac34" to "¾", "sup2" to "²", "sup3" to "³", "micro" to "µ",
        "reg" to "®", "trade" to "™", "copy" to "©", "laquo" to "«", "raquo" to "»",
    )

    /** Decodes numeric and common named HTML entities; unknown entities are kept verbatim. */
    fun decodeEntities(s: String): String = ENTITY.replace(s) { m ->
        val e = m.groupValues[1]
        if (e[0] != '#') return@replace NAMED_ENTITIES[e] ?: m.value
        val cp = if (e[1] == 'x' || e[1] == 'X') e.substring(2).toIntOrNull(16) else e.substring(1).toIntOrNull()
        if (cp != null && cp in 1..0x10FFFF && cp !in 0xD800..0xDFFF) String(Character.toChars(cp)) else m.value
    }

    /** Visible text lines of an HTML fragment, split where a browser would break lines. */
    fun lines(html: String?): List<Line> {
        if (html.isNullOrBlank()) return emptyList()
        var s = SCRIPT_STYLE.replace(html, "").replace('\n', ' ')
        s = LI_OPEN.replace(s, "\n\u0001")
        s = BREAK.replace(s, "\n")
        s = decodeEntities(TAG.replace(s, ""))
        return s.split('\n').mapNotNull { raw ->
            val text = normalizeSpace(raw.replace("\u0001", ""))
            if (text.isEmpty()) null else Line(text, '\u0001' in raw)
        }
    }

    /** Visible text of an HTML fragment on a single line (product and category names). */
    fun text(html: String?): String = lines(html).joinToString(" ") { it.text }

    /**
     * Splits a short description into benefit bullets and application steps. Drops the
     * leading "Description:" label, folds a "For:" style label into the list that follows
     * it, and moves everything after a "HOW TO APPLY" style heading into [ShortDescription.usage].
     */
    fun parseShortDescription(html: String?): ShortDescription {
        val benefits = mutableListOf<String>()
        val usage = mutableListOf<String>()
        var inUsage = false
        var label: String? = null
        val items = mutableListOf<String>()

        fun flushLabel() {
            val pending = label ?: return
            if (items.isNotEmpty()) benefits += "$pending: ${items.joinToString(", ")}"
            label = null
            items.clear()
        }

        for (line in lines(html)) {
            val point = cleanPoint(DESCRIPTION_LABEL.replace(line.text, ""))
            when {
                point.isEmpty() -> Unit
                USAGE_HEADING.matches(point) -> { flushLabel(); inUsage = true }
                inUsage -> usage += point
                !line.listItem && LABEL.matches(point) -> { flushLabel(); label = point.dropLast(1).trim(' ') }
                label != null && line.listItem -> items += point
                label != null && items.isEmpty() -> { items += point; flushLabel() }
                else -> { flushLabel(); benefits += point }
            }
        }
        flushLabel()
        val b = benefits.distinct().take(MAX_POINTS)
        val u = usage.distinct().take(MAX_POINTS)
        return ShortDescription((b + u).joinToString("\n"), b, u)
    }

    /** Extracts the packaging table and any real prose from a product's long description. */
    fun parseDescription(html: String?): Description {
        if (html.isNullOrBlank()) return Description(PackagingTable.EMPTY, "")
        // A few products publish their table as escaped text (&lt;table…); recover the markup.
        val src = if (ESCAPED_TABLE.containsMatchIn(html)) decodeEntities(html) else html
        val match = TABLE.find(src) ?: return Description(PackagingTable.EMPTY, prose(chunks(src)))
        val table = parseTable(match.groupValues[1])
        val recovered = mutableListOf<List<String>>()
        val leftover = mutableListOf<String>()
        for (chunk in chunks(src.substring(0, match.range.first))) {
            val row = orphanRow(chunk, table)
            if (row != null) recovered += row else leftover += chunk
        }
        leftover += chunks(src.substring(match.range.last + 1))
        val packaging = if (recovered.isEmpty()) table else table.copy(rows = recovered + table.rows)
        return Description(packaging, prose(leftover))
    }

    private fun parseTable(inner: String): PackagingTable {
        // Split on row boundaries rather than matching <tr>…</tr> pairs:
        // some published tables omit the opening <tr> of a row.
        val rows = ROW_BOUNDARY.split(inner).mapNotNull { chunk ->
            CELL.findAll(chunk).map { cellText(it.groupValues[1]) }.toList()
                .takeIf { cells -> cells.any { it.isNotEmpty() } }
        }
        if (rows.isEmpty()) return PackagingTable.EMPTY
        val hasHeader = rows[0].any { it.equals("size", ignoreCase = true) }
        val headers = if (hasHeader) rows[0] else DEFAULT_HEADERS.take(rows[0].size)
        val body = (if (hasHeader) rows.drop(1) else rows)
            .filter { it != headers }
            .map { row -> List(headers.size) { i -> row.getOrElse(i) { "" } } }
        return if (body.isEmpty()) PackagingTable.EMPTY else PackagingTable(headers, body)
    }

    /**
     * Recovers a first table row published as a paragraph above the table, e.g.
     * `<p><b>118 ml Tin</b>24144</p>` — the size, then Inner and Master Carton run together.
     * Accepted only when exactly one split uses an Inner Carton value from the same table
     * and divides the Master Carton evenly; anything ambiguous is left out.
     */
    private fun orphanRow(chunk: String, table: PackagingTable): List<String>? {
        if (table.headers.size != 3) return null
        val nodes = TAG.split(chunk).map { normalizeSpace(decodeEntities(it)) }.filter { it.isNotEmpty() }
        if (nodes.size != 2) return null
        val (size, digits) = nodes
        if (size[0] !in '0'..'9' || digits.length > 12 || digits.any { it !in '0'..'9' }) return null
        val innerValues = table.rows.map { it[1] }.toSet()
        val candidates = (1 until digits.length).mapNotNull { i ->
            val inner = digits.substring(0, i)
            val master = digits.substring(i)
            if (inner !in innerValues || master[0] == '0') return@mapNotNull null
            val a = inner.toLong()
            val b = master.toLong()
            if (a > 0 && b >= a && b % a == 0L) listOf(size, inner, master) else null
        }
        return candidates.singleOrNull()
    }

    /** Keeps genuine sentences; drops stray fragments such as "g+" left beside tables. */
    private fun prose(chunks: List<String>): String = chunks
        .map { normalizeSpace(decodeEntities(TAG.replace(it, ""))) }
        .filter { t -> t.split(' ').count { it.isNotEmpty() } >= 4 && t.count { it.isLetter() } >= 15 }
        .joinToString("\n")

    private fun chunks(html: String): List<String> =
        BREAK.split(SCRIPT_STYLE.replace(html, "").replace('\n', ' '))

    private fun cellText(html: String): String =
        normalizeSpace(decodeEntities(TAG.replace(html, " "))).trim('`', ' ')

    private fun cleanPoint(s: String): String =
        TRAILING.replace(SPACE_BEFORE_PUNCT.replace(BULLET.replace(s, ""), "$1"), "").trim(' ')

    private fun normalizeSpace(s: String): String = SPACE_RUN.replace(s, " ").trim(' ')
}
