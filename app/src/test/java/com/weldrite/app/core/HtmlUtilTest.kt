package com.weldrite.app.core

import com.weldrite.app.data.model.PackagingTable
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Cases taken from markup weldrite.in actually publishes. */
class HtmlUtilTest {

    private val header =
        """<tr><td style="background-color: #8d3132"><b style="color: #fff">Size</b></td>""" +
            """<td><b>Inner Carton</b></td><td><b>Master Carton</b></td></tr>"""

    private fun table(vararg rows: List<String>) = PackagingTable(HtmlUtil.DEFAULT_HEADERS, rows.toList())

    @Test
    fun `decodes numeric and named entities and keeps unknown ones`() {
        assertEquals("1/2″ – Tap & Metal", HtmlUtil.decodeEntities("1/2&#8243; &#8211; Tap &amp; Metal"))
        assertEquals("&unknown; &#xZZ;", HtmlUtil.decodeEntities("&unknown; &#xZZ;"))
    }

    @Test
    fun `joins names onto one line`() {
        assertEquals("WLS – WATERPROOFING LIQUID SOLUTION", HtmlUtil.text("WLS &#8211; WATERPROOFING LIQUID SOLUTION"))
    }

    @Test
    fun `parses a regular packaging table`() {
        val html = """<table id="customers"><tbody>$header
            <tr><td><b>237 ml Tin</b></td><td><strong>24</strong></td><td><strong>96</strong></td></tr>
            </tbody></table>"""
        assertEquals(table(listOf("237 ml Tin", "24", "96")), HtmlUtil.parseDescription(html).packaging)
    }

    @Test
    fun `keeps a row whose opening tr is missing`() {
        // Teflon tape pages: the data row has </tr> but no <tr>.
        val html = """<table id="customers"><tbody>$header
            <td><b>12m x 12.5mm</b></td><td><b>250</b></td><td><b>1000</b></td></tr></tbody></table>"""
        assertEquals(table(listOf("12m x 12.5mm", "250", "1000")), HtmlUtil.parseDescription(html).packaging)
    }

    @Test
    fun `parses a table published as escaped text with its own headers`() {
        // Ball valve page: the whole table is entity-escaped inside a paragraph.
        val html = "<p>&lt;table id=&#8221;customers&#8221;&gt;<br />\n&lt;tr&gt;<br />\n" +
            "&lt;td&gt;&lt;b&gt;Size&lt;/b&gt;&lt;/td&gt;<br />\n&lt;td&gt;&lt;b&gt;PKG PCS&lt;/b&gt;&lt;/td&gt;<br />\n" +
            "&lt;/tr&gt;<br />\n&lt;tr&gt;<br />\n&lt;td&gt;&lt;b&gt;1/2&#8243;&lt;/b&gt;&lt;/td&gt;<br />\n" +
            "&lt;td&gt;&lt;b&gt;`100&lt;/b&gt;&lt;/td&gt;<br />\n&lt;/tr&gt;<br />\n&lt;/table&gt;</p>"
        val parsed = HtmlUtil.parseDescription(html)
        assertEquals(PackagingTable(listOf("Size", "PKG PCS"), listOf(listOf("1/2″", "100"))), parsed.packaging)
        assertEquals("", parsed.prose)
    }

    @Test
    fun `recovers a first row published above the table`() {
        val html = """<p><b style="color: #333">118 ml Tin</b>24144</p><table>$header
            <tr><td>237 ml Tin</td><td>24</td><td>96</td></tr>
            <tr><td>946 ml Tin</td><td>12</td><td>24</td></tr></table>"""
        val parsed = HtmlUtil.parseDescription(html)
        assertEquals(
            table(listOf("118 ml Tin", "24", "144"), listOf("237 ml Tin", "24", "96"), listOf("946 ml Tin", "12", "24")),
            parsed.packaging,
        )
        assertEquals("", parsed.prose)
    }

    @Test
    fun `does not guess when an orphan row splits more than one way`() {
        // "1224" could be 1|224 or 12|24 — both inner values exist in the table, so leave it out.
        val html = """<p><b>250 ml</b>1224</p><table>$header
            <tr><td>500 ml</td><td>1</td><td>72</td></tr>
            <tr><td>1 L</td><td>12</td><td>24</td></tr></table>"""
        assertEquals(2, HtmlUtil.parseDescription(html).packaging.rows.size)
    }

    @Test
    fun `drops stray fragments but keeps real prose around the table`() {
        val html = """<p>g+</p><table>$header<tr><td>20 gm</td><td>32</td><td>256</td></tr></table>
            <p>Store in a cool and dry place away from direct sunlight.</p>"""
        val parsed = HtmlUtil.parseDescription(html)
        assertEquals("Store in a cool and dry place away from direct sunlight.", parsed.prose)
        assertEquals(1, parsed.packaging.rows.size)
    }

    @Test
    fun `folds line breaks inside cells and keeps blank cells as published`() {
        val html = """<table>$header<tr><td><b>90 gm (50R+40H) Tube<br />
            </b></td><td><b> </b></td><td>96</td></tr></table>"""
        assertEquals(table(listOf("90 gm (50R+40H) Tube", "", "96")), HtmlUtil.parseDescription(html).packaging)
    }

    @Test
    fun `strips the description label and tidies each point`() {
        val html = "<p><strong>Description:<br />\n</strong>Solvent Cement,<br />\nMeets ASTM D-2564,<br />\n" +
            "Heavy Duty Clear , Fast Setting</p>"
        assertEquals(
            listOf("Solvent Cement", "Meets ASTM D-2564", "Heavy Duty Clear, Fast Setting"),
            HtmlUtil.parseShortDescription(html).benefits,
        )
    }

    @Test
    fun `folds a label into the list that follows it`() {
        val html = "<p><strong>Description:<br />\n</strong>Tap &amp; Metal Cleaner Advanced Formula</p>\n" +
            "<p><strong>For:</strong></p>\n<ol>\n<li>Taps</li>\n<li>Brass &amp; Copper</li>\n</ol>\n" +
            "<p>Chrome Cleaner, CP Fittings, Appliances</p>\n<p>&nbsp;</p>"
        assertEquals(
            listOf("Tap & Metal Cleaner Advanced Formula", "For: Taps, Brass & Copper", "Chrome Cleaner, CP Fittings, Appliances"),
            HtmlUtil.parseShortDescription(html).benefits,
        )
    }

    @Test
    fun `separates application steps from benefits`() {
        val html = "<p>Use for repairing any leak in plastic &amp; metal water tank.</p>\n" +
            "<p>HOW TO APPLY<br />\nEnsure the tank is empty.<br />\nDry the crack.</p>"
        val parsed = HtmlUtil.parseShortDescription(html)
        assertEquals(listOf("Use for repairing any leak in plastic & metal water tank."), parsed.benefits)
        assertEquals(listOf("Ensure the tank is empty.", "Dry the crack."), parsed.usage)
        assertTrue(parsed.text.endsWith("Dry the crack."))
    }

    @Test
    fun `handles missing content`() {
        assertEquals(PackagingTable.EMPTY, HtmlUtil.parseDescription(null).packaging)
        assertEquals(emptyList<String>(), HtmlUtil.parseShortDescription("<p>&nbsp;</p>").benefits)
    }
}
