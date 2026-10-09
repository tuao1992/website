package com.weldrite.app.data.repository

import android.content.Context
import androidx.room.withTransaction
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
    private val db: WeldriteDatabase = WeldriteDatabase.get(context),
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
        productDao.related(product.category, product.id, limit).map { it.toDomain() }

    /** Populate Room from the bundled seed the first time the app runs. */
    suspend fun seedIfNeeded() {
        val seed = seedSource.load()
        db.withTransaction {
            if (productDao.count() == 0) {
                productDao.upsertAll(seed.products.map { it.toEntity() })
                categoryDao.upsertAll(seed.categories.map { it.toEntity() })
            }
            // Downloads are tiny and curated in the seed — mirror it exactly.
            downloadDao.clear()
            downloadDao.upsertAll(seed.downloads.map { it.toEntity() })
        }
    }

    /** Refresh products & categories from the live WooCommerce Store API. */
    suspend fun refresh(): Result<Unit> = runCatching {
        if (!Config.ENABLE_LIVE_REFRESH) return@runCatching
        val remoteProducts = fetchAllProducts()
        val remoteCategories = api.getCategories(perPage = STORE_PAGE_SIZE)
            .map { it.toDomain() }
            .filter { it.productCount > 0 }
        db.withTransaction {
            // Reconcile only against non-empty responses so a bad fetch never wipes the cache.
            if (remoteProducts.isNotEmpty()) {
                productDao.upsertAll(remoteProducts.map { it.toEntity() })
                productDao.deleteNotIn(remoteProducts.map { it.id })
            }
            if (remoteCategories.isNotEmpty()) {
                categoryDao.upsertAll(remoteCategories.map { it.toEntity() })
                categoryDao.deleteNotIn(remoteCategories.map { it.id })
            }
        }
    }

    /** Pages through the Store API until a short page marks the end of the catalogue. */
    private suspend fun fetchAllProducts(): List<Product> {
        val all = mutableListOf<Product>()
        for (page in 1..MAX_STORE_PAGES) {
            val batch = api.getProducts(perPage = STORE_PAGE_SIZE, page = page)
            all += batch.map { it.toDomain() }
            if (batch.size < STORE_PAGE_SIZE) break
        }
        return all
    }

    private companion object {
        /** The Store API caps per_page at 100. */
        const val STORE_PAGE_SIZE = 100
        const val MAX_STORE_PAGES = 20
    }
}
