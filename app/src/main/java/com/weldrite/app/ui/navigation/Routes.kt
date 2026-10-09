package com.weldrite.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.ui.graphics.vector.ImageVector

/** All navigation destinations in the app. */
object Routes {
    const val SPLASH = "splash"
    const val HOME = "home"
    const val PRODUCTS = "products"
    const val DEALERS = "dealers"
    const val DOWNLOADS = "downloads"
    const val CONTACT = "contact"

    const val PRODUCT_DETAIL = "product/{id}"
    const val CATEGORY = "category/{name}"
    const val SEARCH = "search"
    const val ABOUT = "about"
    const val CERTIFICATIONS = "certifications"
    const val DISTRIBUTOR = "distributor"
    const val SETTINGS = "settings"

    fun productDetail(id: Int) = "product/$id"
    fun category(name: String) = "category/${name}"
}

/** Bottom-navigation tabs (Phase 3). */
enum class BottomTab(
    val route: String,
    val label: String,
    val icon: ImageVector,
) {
    HOME(Routes.HOME, "Home", Icons.Outlined.Home),
    PRODUCTS(Routes.PRODUCTS, "Products", Icons.Outlined.Inventory2),
    DEALERS(Routes.DEALERS, "Dealers", Icons.Outlined.Storefront),
    DOWNLOADS(Routes.DOWNLOADS, "Downloads", Icons.Outlined.Download),
    CONTACT(Routes.CONTACT, "Contact", Icons.Outlined.MailOutline),
}
