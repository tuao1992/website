package com.weldrite.app.data

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.weldrite.app.data.remote.dto.SeedDto
import com.weldrite.app.data.remote.dto.StoreCategoryDto
import com.weldrite.app.data.remote.dto.StoreProductDto
import com.weldrite.app.data.remote.dto.toDomain
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

/**
 * The bundled seed (written by tools/refresh_content.py) must equal what the app's own
 * live refresh builds from the same Store API responses; otherwise the first sync after
 * install would visibly change product pages. The script writes these fixtures in the
 * same run as the seed, so a failure here means the Python and Kotlin parsers diverged.
 */
class SeedConsistencyTest {

    private val gson = Gson()

    private val seed = File("src/main/assets/app_data.json")
        .reader(Charsets.UTF_8)
        .use { gson.fromJson(it, SeedDto::class.java) }
        .toDomain()

    private inline fun <reified T> fixture(name: String): T {
        val stream = requireNotNull(javaClass.classLoader?.getResourceAsStream(name)) { "missing fixture $name" }
        return stream.reader(Charsets.UTF_8).use { gson.fromJson(it, object : TypeToken<T>() {}.type) }
    }

    @Test
    fun `seed products match the live refresh mapping`() {
        val live = fixture<List<StoreProductDto>>("store_products.json").map { it.toDomain() }
        assertEquals(live.map { it.id }, seed.products.map { it.id })
        live.zip(seed.products).forEach { (expected, actual) ->
            assertEquals("product ${expected.id} (${expected.name})", expected, actual)
        }
    }

    @Test
    fun `seed categories match the live refresh mapping`() {
        val live = fixture<List<StoreCategoryDto>>("store_categories.json")
            .map { it.toDomain() }
            .filter { it.productCount > 0 }
        assertEquals(live, seed.categories)
    }
}
