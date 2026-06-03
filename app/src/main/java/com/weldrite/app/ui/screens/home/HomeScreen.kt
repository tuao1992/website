package com.weldrite.app.ui.screens.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.weldrite.app.R
import com.weldrite.app.data.model.CompanyInfo
import com.weldrite.app.data.model.CompanyStat
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.model.ProductCategory
import com.weldrite.app.ui.components.NetworkImage
import com.weldrite.app.ui.components.ProductCard
import com.weldrite.app.ui.components.SectionHeader
import com.weldrite.app.ui.components.categoryIcon
import com.weldrite.app.ui.theme.BrandMaroon
import kotlinx.coroutines.delay

private val heroImages = listOf(
    R.drawable.hero_11_2, R.drawable.hero_22_1, R.drawable.hero_33_4,
    R.drawable.hero_44_2, R.drawable.hero_55_4,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onProductClick: (Int) -> Unit,
    onCategoryClick: (String) -> Unit,
    onSeeAllProducts: () -> Unit,
    onSearch: () -> Unit,
    onContact: () -> Unit,
    onDistributor: () -> Unit,
    onAbout: () -> Unit,
    onCertifications: () -> Unit,
    onSettings: () -> Unit,
    viewModel: HomeViewModel = viewModel(factory = HomeViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val company = viewModel.company

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Image(
                        painter = painterResource(R.drawable.logo),
                        contentDescription = "Weldrite",
                        modifier = Modifier.height(34.dp),
                    )
                },
                actions = {
                    IconButton(onClick = onSearch) {
                        Icon(Icons.Filled.Search, contentDescription = "Search")
                    }
                    IconButton(onClick = onSettings) {
                        Icon(Icons.Outlined.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(bottom = 28.dp),
        ) {
            item { HeroSlider(company, onSeeAllProducts) }
            item { StatsRow(company.stats) }
            item {
                SectionHeader(
                    title = "Product Categories",
                    actionLabel = "View all",
                    onAction = onSeeAllProducts,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            item { CategoryGrid(state.categories, onCategoryClick) }

            if (state.featured.isNotEmpty()) {
                item {
                    SectionHeader(
                        title = "Featured Products",
                        actionLabel = "See all",
                        onAction = onSeeAllProducts,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                item { ProductRail(state.featured, onProductClick) }
            }

            item { CertificationHighlight(onCertifications) }

            if (state.newLaunches.isNotEmpty()) {
                item {
                    SectionHeader(
                        title = "New Product Launches",
                        actionLabel = "See all",
                        onAction = onSeeAllProducts,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                item { ProductRail(state.newLaunches, onProductClick) }
            }

            item { WhyChooseUs(company) }
            item { CtaSection(onContact, onDistributor) }
            item { HomeFooter(company, onAbout) }
        }
    }
}

@Composable
private fun HeroSlider(company: CompanyInfo, onCta: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { heroImages.size })
    LaunchedEffect(Unit) {
        while (true) {
            delay(4000)
            val next = (pagerState.currentPage + 1) % heroImages.size
            pagerState.animateScrollToPage(next)
        }
    }
    Box(
        Modifier
            .fillMaxWidth()
            .height(220.dp)
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(20.dp)),
    ) {
        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxWidth()) { page ->
            Image(
                painter = painterResource(heroImages[page]),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().height(220.dp),
            )
        }
        Box(
            Modifier
                .fillMaxWidth()
                .height(220.dp)
                .background(
                    Brush.verticalGradient(
                        0f to Color.Black.copy(alpha = 0.05f),
                        1f to Color.Black.copy(alpha = 0.75f),
                    )
                ),
        )
        Column(
            Modifier
                .align(Alignment.BottomStart)
                .padding(20.dp),
        ) {
            Text(
                company.subTagline,
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
                fontWeight = FontWeight.Bold,
            )
            Text(
                company.tagline,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.9f),
                modifier = Modifier.padding(top = 2.dp),
            )
            Button(
                onClick = onCta,
                modifier = Modifier.padding(top = 10.dp),
            ) {
                Text("Discover More")
                Spacer(Modifier.width(6.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
            }
        }
        // Pager dots
        Row(
            Modifier.align(Alignment.TopEnd).padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            repeat(heroImages.size) { i ->
                val active = i == pagerState.currentPage
                Box(
                    Modifier
                        .size(if (active) 9.dp else 7.dp)
                        .clip(RoundedCornerShape(50))
                        .background(if (active) Color.White else Color.White.copy(alpha = 0.5f))
                )
            }
        }
    }
}

@Composable
private fun StatsRow(stats: List<CompanyStat>) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        stats.take(4).forEach { stat ->
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Column(
                    Modifier.padding(vertical = 12.dp, horizontal = 6.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        stat.value,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        stat.label,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryGrid(categories: List<ProductCategory>, onClick: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(categories, key = { it.id }) { cat ->
            Column(
                Modifier
                    .width(88.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .clickable { onClick(cat.name) }
                    .padding(vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.size(60.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            categoryIcon(cat.icon),
                            contentDescription = cat.name,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(28.dp),
                        )
                    }
                }
                Text(
                    cat.name,
                    style = MaterialTheme.typography.labelMedium,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }
}

@Composable
private fun ProductRail(products: List<Product>, onClick: (Int) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(products, key = { it.id }) { product ->
            ProductCard(
                product = product,
                onClick = { onClick(product.id) },
                modifier = Modifier.width(170.dp),
            )
        }
    }
}

@Composable
private fun CertificationHighlight(onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = BrandMaroon),
    ) {
        Row(
            Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.WorkspacePremium,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(40.dp),
            )
            Column(Modifier.padding(start = 14.dp).weight(1f)) {
                Text(
                    "ISO Certified & NSF-grade Quality",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Meets ASTM & ANSI standards. Every batch tested with reports available.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.9f),
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.White)
        }
    }
}

@Composable
private fun WhyChooseUs(company: CompanyInfo) {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text("Why Choose Weldrite?", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        company.whyChooseUs.forEach { point ->
            Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
                Icon(
                    Icons.Outlined.VerifiedUser,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp).padding(top = 2.dp),
                )
                Text(
                    point,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(start = 10.dp),
                )
            }
        }
    }
}

@Composable
private fun CtaSection(onContact: () -> Unit, onDistributor: () -> Unit) {
    Column(Modifier.padding(16.dp)) {
        Card(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        ) {
            Column(Modifier.padding(18.dp)) {
                Text(
                    "Partner with Weldrite",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Join 200+ distributors across India or talk to our experts for your project requirements.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Row(
                    Modifier.padding(top = 14.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Button(onClick = onDistributor, modifier = Modifier.weight(1f)) {
                        Text("Become a Distributor")
                    }
                    OutlinedButton(onClick = onContact, modifier = Modifier.weight(1f)) {
                        Text("Contact Us")
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeFooter(company: CompanyInfo, onAbout: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            company.legalName,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Text(
            "ISO-certified since 2007 • Made in Navi Mumbai, India",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 2.dp),
        )
        OutlinedButton(onClick = onAbout, modifier = Modifier.padding(top = 10.dp)) {
            Text("About Weldrite")
        }
    }
}
