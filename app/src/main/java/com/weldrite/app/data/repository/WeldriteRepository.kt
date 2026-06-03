package com.weldrite.app.data.repository

import android.content.Context
import com.weldrite.app.core.Config
import com.weldrite.app.data.local.WeldriteDatabase
import com.weldrite.app.data.local.toDomain
import com.weldrite.app.data.local.toEntity
import com.weldrite.app.data.model.CompanyInfo
import com.weldrite.app.data.model.ContactInfo
import com.weldrite.app.data.model.DownloadItem
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.model.ProductCategory
import com.weldrite.app.data.remote.NetworkModule
import com.weldrite.app.data.remote.WeldriteApi
import com.weldrite.app.data.remote.dto.toDomain
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Single source of truth for app content. Implements an offline-first strategy:
 *  1. Seed Room from the bundled asset on first launch (instant, no network).
 *  2. Expose data to the UI as Room-backed Flows.
 *  3. Refresh from the live WooCommerce Store API when online (Phase 9 caching).
 */
class WeldriteRepository(
    context: Context,
    private val api: WeldriteApi = NetworkModule.api(),
    db: WeldriteDatabase = WeldriteDatabase.get(context),
) {
    private val seedSource = SeedDataSource(context.applicationContext)
    private val productDao = db.productDao()
    private val categoryDao = db.categoryDao()
    private val downloadDao = db.downloadDao()

    val company: CompanyInfo get() = seedSource.load().company
    val contact: ContactInfo get() = seedSource.load().contact

    fun observeProducts(): Flow<List<Product>> =
        productDao.observeAll().map { list -> list.map { it.toDomain() } }

    fun observeCategories(): Flow<List<ProductCategory>> =
        categoryDao.observeAll().map { list -> list.map { it.toDomain() } }

    fun observeProductsByCategory(category: String): Flow<List<Product>> =
        productDao.observeByCategory(category).map { list -> list.map { it.toDomain() } }

    fun observeDownloads(): Flow<List<DownloadItem>> =
        downloadDao.observeAll().map { list -> list.map { it.toDomain() } }

    suspend fun getProduct(id: Int): Product? = productDao.getById(id)?.toDomain()

    /** Products in the same category, excluding the given product (for "Related"). */
    suspend fun relatedProducts(product: Product, limit: Int = 6): List<Product> =
        seedSource.load().products
            .filter { it.category == product.category && it.id != product.id }
            .take(limit)

    /** Populate Room from the bundled seed the first time the app runs. */
    suspend fun seedIfNeeded() {
        val seed = seedSource.load()
        if (productDao.count() == 0) {
            productDao.upsertAll(seed.products.map { it.toEntity() })
            categoryDao.upsertAll(seed.categories.map { it.toEntity() })
        }
        // Downloads are tiny and may change — always keep them in sync with the seed.
        downloadDao.upsertAll(seed.downloads.map { it.toEntity() })
    }

    /** Refresh products & categories from the live WooCommerce Store API. */
    suspend fun refresh(): Result<Unit> = runCatching {
        if (!Config.ENABLE_LIVE_REFRESH) return@runCatching
        val remoteProducts = api.getProducts(perPage = 100, page = 1).map { it.toDomain() }
        val remoteCategories = api.getCategories(perPage = 100)
            .map { it.toDomain() }
            .filter { it.productCount > 0 }
        if (remoteProducts.isNotEmpty()) {
            productDao.upsertAll(remoteProducts.map { it.toEntity() })
        }
        if (remoteCategories.isNotEmpty()) {
            categoryDao.upsertAll(remoteCategories.map { it.toEntity() })
        }
    }
}
