package com.weldrite.app.data.remote.dto

import com.weldrite.app.core.HtmlUtil
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.model.ProductCategory

/** WooCommerce Store API product shape (wp-json/wc/store/v1/products). */
data class StoreProductDto(
    val id: Int,
    val name: String?,
    val slug: String?,
    val sku: String?,
    val permalink: String?,
    val short_description: String?,
    val description: String?,
    val images: List<StoreImageDto>?,
    val categories: List<StoreTermDto>?,
)

data class StoreImageDto(val src: String?, val thumbnail: String?)
data class StoreTermDto(val id: Int, val name: String?, val slug: String?)

/** WooCommerce Store API category shape (wp-json/wc/store/v1/products/categories). */
data class StoreCategoryDto(
    val id: Int,
    val name: String?,
    val slug: String?,
    val count: Int?,
    val image: StoreImageDto?,
)

fun StoreProductDto.toDomain(): Product {
    val catNames = categories?.mapNotNull { it.name } ?: emptyList()
    return Product(
        id = id,
        name = HtmlUtil.clean(name),
        slug = slug.orEmpty(),
        sku = sku.orEmpty(),
        category = catNames.firstOrNull() ?: "Other",
        categories = catNames,
        imageUrl = images?.firstOrNull()?.src.orEmpty(),
        permalink = permalink.orEmpty(),
        shortDescription = HtmlUtil.clean(short_description),
        benefits = HtmlUtil.parseBenefits(short_description),
        packaging = HtmlUtil.parsePackaging(description),
        description = HtmlUtil.clean(description),
    )
}

fun StoreCategoryDto.toDomain(): ProductCategory = ProductCategory(
    id = id,
    name = name.orEmpty(),
    slug = slug.orEmpty(),
    productCount = count ?: 0,
    icon = "product",
    imageUrl = image?.src.orEmpty(),
)
