package com.weldrite.app.ui.navigation

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.weldrite.app.ui.screens.about.AboutScreen
import com.weldrite.app.ui.screens.certifications.CertificationsScreen
import com.weldrite.app.ui.screens.contact.ContactScreen
import com.weldrite.app.ui.screens.dealers.DealersScreen
import com.weldrite.app.ui.screens.distributor.DistributorScreen
import com.weldrite.app.ui.screens.downloads.DownloadsScreen
import com.weldrite.app.ui.screens.home.HomeScreen
import com.weldrite.app.ui.screens.productdetail.ProductDetailScreen
import com.weldrite.app.ui.screens.products.ProductsScreen
import com.weldrite.app.ui.screens.search.SearchScreen
import com.weldrite.app.ui.screens.settings.SettingsScreen
import com.weldrite.app.ui.screens.splash.SplashScreen

private val tabRoutes = BottomTab.entries.map { it.route }.toSet()

@Composable
fun WeldriteNavHost() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentBase = backStackEntry?.destination?.route?.substringBefore('?')
    val showBottomBar = currentBase in tabRoutes

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    BottomTab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = currentBase == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.SPLASH,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .consumeWindowInsets(innerPadding),
        ) {
            composable(Routes.SPLASH) {
                SplashScreen(onFinished = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                })
            }

            composable(Routes.HOME) {
                HomeScreen(
                    onProductClick = { navController.navigate(Routes.productDetail(it)) },
                    onCategoryClick = { navController.navigate(Routes.category(it)) },
                    onSeeAllProducts = { navController.navigateToTab(Routes.PRODUCTS) },
                    onSearch = { navController.navigate(Routes.SEARCH) },
                    onContact = { navController.navigateToTab(Routes.CONTACT) },
                    onDistributor = { navController.navigate(Routes.DISTRIBUTOR) },
                    onAbout = { navController.navigate(Routes.ABOUT) },
                    onCertifications = { navController.navigate(Routes.CERTIFICATIONS) },
                    onSettings = { navController.navigate(Routes.SETTINGS) },
                )
            }

            composable(Routes.PRODUCTS) {
                ProductsScreen(onProductClick = { navController.navigate(Routes.productDetail(it)) })
            }

            composable(Routes.DEALERS) {
                DealersScreen(onBecomeDistributor = { navController.navigate(Routes.DISTRIBUTOR) })
            }

            composable(Routes.DOWNLOADS) { DownloadsScreen() }

            composable(
                route = Routes.CONTACT + "?product={product}",
                arguments = listOf(navArgument("product") { type = NavType.StringType; nullable = true; defaultValue = null }),
            ) { entry ->
                ContactScreen(product = entry.arguments?.getString("product"))
            }

            composable(
                route = Routes.PRODUCT_DETAIL,
                arguments = listOf(navArgument("id") { type = NavType.IntType }),
            ) { entry ->
                val id = entry.arguments?.getInt("id") ?: return@composable
                ProductDetailScreen(
                    productId = id,
                    onBack = { navController.popBackStack() },
                    onProductClick = { navController.navigate(Routes.productDetail(it)) },
                    onInquire = { product ->
                        navController.navigate(Routes.CONTACT + "?product=${java.net.URLEncoder.encode(product, "UTF-8")}")
                    },
                )
            }

            composable(
                route = Routes.CATEGORY,
                arguments = listOf(navArgument("name") { type = NavType.StringType }),
            ) { entry ->
                val name = entry.arguments?.getString("name").orEmpty()
                ProductsScreen(
                    onProductClick = { navController.navigate(Routes.productDetail(it)) },
                    title = name,
                    initialCategory = name,
                    showBack = true,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Routes.SEARCH) {
                SearchScreen(
                    onProductClick = { navController.navigate(Routes.productDetail(it)) },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Routes.ABOUT) { AboutScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.CERTIFICATIONS) { CertificationsScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.DISTRIBUTOR) { DistributorScreen(onBack = { navController.popBackStack() }) }
            composable(Routes.SETTINGS) { SettingsScreen(onBack = { navController.popBackStack() }) }
        }
    }
}

/** Navigate to a bottom-tab destination with state preservation. */
private fun androidx.navigation.NavController.navigateToTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
