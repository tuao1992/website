package com.weldrite.app.data.model

/**
 * A product's packaging / specification table exactly as weldrite.in publishes it.
 * Most products use Size | Inner Carton | Master Carton; ball valves use Size | PKG PCS.
 */
data class PackagingTable(
    val headers: List<String>,
    val rows: List<List<String>>,
) {
    fun isEmpty(): Boolean = rows.isEmpty()

    companion object {
        val EMPTY = PackagingTable(emptyList(), emptyList())
    }
}

/** A Weldrite product (domain model used throughout the UI). */
data class Product(
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
    /** Application steps (e.g. TankSeal's "HOW TO APPLY"); empty for most products. */
    val usage: List<String>,
    val packaging: PackagingTable,
    val description: String,
) {
    /** Applications are derived from category for a richer detail screen. */
    val applications: List<String>
        get() = ApplicationHints.forCategory(category)
}

/** A product category with its product count. */
data class ProductCategory(
    val id: Int,
    val name: String,
    val slug: String,
    val productCount: Int,
    val icon: String,
    val imageUrl: String,
)

/** A downloadable resource (brochure / catalogue / technical sheet / certificate). */
data class DownloadItem(
    val title: String,
    val type: String,
    val url: String,
    val description: String,
)

data class CompanyStat(val value: String, val label: String)
data class CompanyFeature(val title: String, val points: List<String>)
data class Certification(val name: String, val detail: String)

/** Static company / brand information, sourced from the bundled seed (and refreshable). */
data class CompanyInfo(
    val name: String,
    val legalName: String,
    val tagline: String,
    val subTagline: String,
    val about: String,
    val welcome: String,
    val stats: List<CompanyStat>,
    val whyChooseUs: List<String>,
    val features: List<CompanyFeature>,
    val certifications: List<Certification>,
)

/** Contact / head-office details. */
data class ContactInfo(
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

/** Top-level container parsed from the bundled seed + held in memory. */
data class AppContent(
    val company: CompanyInfo,
    val contact: ContactInfo,
    val categories: List<ProductCategory>,
    val products: List<Product>,
    val downloads: List<DownloadItem>,
)

/**
 * Icon key for a category slug, resolved by ui.components.categoryIcon. Shared by the
 * bundled seed and live refresh so categories keep their icons after a sync.
 */
object CategoryIcons {
    fun forSlug(slug: String): String = when (slug) {
        "abs", "cpvc", "pvc", "upvc" -> "solvent"
        "adhesives" -> "adhesive"
        "ball-valve" -> "valve"
        "cleaner" -> "cleaner"
        "primer" -> "primer"
        "rubber-lubricant" -> "lubricant"
        "teflon-tape" -> "tape"
        "waterproofing" -> "waterproof"
        else -> "product"
    }
}

/** Maps a product category to representative real-world applications. */
object ApplicationHints {
    fun forCategory(category: String): List<String> = when (category) {
        "UPVC", "PVC" -> listOf("Plumbing & water supply lines", "Agricultural pipelines", "Drainage & sewage systems")
        "CPVC" -> listOf("Hot & cold water plumbing", "Industrial fluid handling", "Fire-sprinkler systems")
        "ABS" -> listOf("DWV (drain-waste-vent) systems", "Compressed-air lines", "Industrial piping")
        "Ball Valve" -> listOf("Flow control in plumbing lines", "Irrigation systems", "Industrial fluid lines")
        "Teflon Tape" -> listOf("Threaded pipe sealing", "Plumbing joints", "Gas & water fittings")
        "Adhesives" -> listOf("Instant bonding & repairs", "Industrial assembly", "Multi-surface fixing")
        "Cleaner" -> listOf("Surface preparation before solvent welding", "Pipe & fitting cleaning", "Maintenance")
        "Primer" -> listOf("Pre-cement surface priming", "Pressure pipe joints", "Potable water systems")
        "Waterproofing" -> listOf("Terrace & roof waterproofing", "Bathrooms & wet areas", "Concrete repair")
        "Rubber Lubricant" -> listOf("Push-fit pipe assembly", "Rubber-ring joint lubrication", "Sealing rings")
        else -> listOf("Construction & repair", "Industrial use", "Domestic use")
    }
}
