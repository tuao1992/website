package com.weldrite.app.data.model

/** Packaging row from a product spec table (Size / Inner Carton / Master Carton). */
data class Packaging(
    val size: String,
    val innerCarton: String,
    val masterCarton: String,
)

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
    val packaging: List<Packaging>,
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
