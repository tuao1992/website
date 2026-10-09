package com.weldrite.app.data.remote.dto

import com.google.gson.annotations.SerializedName
import com.weldrite.app.data.model.AppContent
import com.weldrite.app.data.model.Certification
import com.weldrite.app.data.model.CompanyFeature
import com.weldrite.app.data.model.CompanyInfo
import com.weldrite.app.data.model.CompanyStat
import com.weldrite.app.data.model.ContactInfo
import com.weldrite.app.data.model.DownloadItem
import com.weldrite.app.data.model.PackagingTable
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.model.ProductCategory

/** Mirrors assets/app_data.json — the offline-first seed shipped with the app. */
data class SeedDto(
    val company: CompanyDto,
    val contact: ContactDto,
    val categories: List<CategoryDto>,
    val products: List<ProductDto>,
    val downloads: List<DownloadDto>,
)

data class CompanyDto(
    val name: String,
    val legalName: String,
    val tagline: String,
    val subTagline: String,
    val about: String,
    val welcome: String,
    val stats: List<StatDto>,
    val whyChooseUs: List<String>,
    val features: List<FeatureDto>,
    val certifications: List<CertDto>,
)

data class StatDto(val value: String, val label: String)
data class FeatureDto(val title: String, val points: List<String>)
data class CertDto(val name: String, val detail: String)

data class ContactDto(
    val phone: String,
    val phoneDisplay: String,
    val whatsapp: String,
    val email: String,
    val hours: String,
    val address: String,
    val city: String,
    val state: String,
    val pincode: String,
    val lat: Double,
    val lng: Double,
    val website: String,
)

data class CategoryDto(
    val id: Int,
    val name: String,
    val slug: String,
    val productCount: Int,
    val icon: String,
    val imageUrl: String,
)

data class PackagingTableDto(val headers: List<String>?, val rows: List<List<String>>?)

data class ProductDto(
    val id: Int,
    val name: String,
    val slug: String,
    val sku: String,
    val category: String,
    val categories: List<String>,
    val imageUrl: String,
    val permalink: String,
    val shortDescription: String,
    val benefits: List<String>,
    val usage: List<String>?,
    val packaging: PackagingTableDto?,
    val description: String,
)

data class DownloadDto(
    val title: String,
    val type: String,
    val url: String,
    @SerializedName("desc") val description: String,
)

/* ---------- DTO -> domain mappers ---------- */

fun SeedDto.toDomain(): AppContent = AppContent(
    company = company.toDomain(),
    contact = contact.toDomain(),
    categories = categories.map { it.toDomain() },
    products = products.map { it.toDomain() },
    downloads = downloads.map { it.toDomain() },
)

fun CompanyDto.toDomain() = CompanyInfo(
    name = name, legalName = legalName, tagline = tagline, subTagline = subTagline,
    about = about, welcome = welcome,
    stats = stats.map { CompanyStat(it.value, it.label) },
    whyChooseUs = whyChooseUs,
    features = features.map { CompanyFeature(it.title, it.points) },
    certifications = certifications.map { Certification(it.name, it.detail) },
)

fun ContactDto.toDomain() = ContactInfo(
    phone, phoneDisplay, whatsapp, email, hours, address, city, state, pincode, lat, lng, website
)

fun CategoryDto.toDomain() = ProductCategory(id, name, slug, productCount, icon, imageUrl)

fun ProductDto.toDomain() = Product(
    id = id, name = name, slug = slug, sku = sku, category = category, categories = categories,
    imageUrl = imageUrl, permalink = permalink, shortDescription = shortDescription,
    benefits = benefits, usage = usage.orEmpty(),
    packaging = packaging?.let { PackagingTable(it.headers.orEmpty(), it.rows.orEmpty()) } ?: PackagingTable.EMPTY,
    description = description,
)

fun DownloadDto.toDomain() = DownloadItem(title, type, url, description)
