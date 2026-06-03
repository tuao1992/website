package com.weldrite.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.weldrite.app.data.model.DownloadItem
import com.weldrite.app.data.model.Packaging
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.model.ProductCategory

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val slug: String,
    val sku: String,
    val category: String,
    val categories: List<String>,
    val imageUrl: String,
    val permalink: String,
    val shortDescription: String,
    val benefits: List<String>,
    val packaging: List<Packaging>,
    val description: String,
)

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val slug: String,
    val productCount: Int,
    val icon: String,
    val imageUrl: String,
)

@Entity(tableName = "downloads")
data class DownloadEntity(
    @PrimaryKey val url: String,
    val title: String,
    val type: String,
    val description: String,
)

/* ---------- entity <-> domain ---------- */

fun ProductEntity.toDomain() = Product(
    id, name, slug, sku, category, categories, imageUrl, permalink,
    shortDescription, benefits, packaging, description
)

fun Product.toEntity() = ProductEntity(
    id, name, slug, sku, category, categories, imageUrl, permalink,
    shortDescription, benefits, packaging, description
)

fun CategoryEntity.toDomain() = ProductCategory(id, name, slug, productCount, icon, imageUrl)
fun ProductCategory.toEntity() = CategoryEntity(id, name, slug, productCount, icon, imageUrl)

fun DownloadEntity.toDomain() = DownloadItem(title, type, url, description)
fun DownloadItem.toEntity() = DownloadEntity(url, title, type, description)
