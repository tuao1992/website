package com.weldrite.app.ui.screens.productdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.weldrite.app.core.ContactActions
import com.weldrite.app.data.model.Packaging
import com.weldrite.app.data.model.Product
import com.weldrite.app.ui.components.CategoryPill
import com.weldrite.app.ui.components.LoadingState
import com.weldrite.app.ui.components.NetworkImage
import com.weldrite.app.ui.components.ProductCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDetailScreen(
    productId: Int,
    onBack: () -> Unit,
    onProductClick: (Int) -> Unit,
    onInquire: (String) -> Unit,
    viewModel: ProductDetailViewModel = viewModel(factory = ProductDetailViewModel.Factory),
) {
    LaunchedEffect(productId) { viewModel.load(productId) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val product = state.product

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product?.category ?: "Product", maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (product != null) {
                        IconButton(onClick = {
                            ContactActions.share(
                                context,
                                product.name,
                                "Check out ${product.name} from Weldrite — ${product.permalink.ifBlank { "https://weldrite.in" }}",
                            )
                        }) { Icon(Icons.Filled.Share, contentDescription = "Share") }
                    }
                },
            )
        },
        bottomBar = {
            if (product != null) {
                Surface(shadowElevation = 8.dp, color = MaterialTheme.colorScheme.surface) {
                    Row(
                        Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        OutlinedButton(
                            onClick = {
                                ContactActions.whatsapp(
                                    context, viewModel.contact.whatsapp,
                                    "Hi, I'm interested in ${product.name}. Please share details & pricing.",
                                )
                            },
                            modifier = Modifier.weight(1f),
                        ) { Text("WhatsApp") }
                        Button(
                            onClick = { onInquire(product.name) },
                            modifier = Modifier.weight(1f),
                        ) { Text("Send Inquiry") }
                    }
                }
            }
        },
    ) { padding ->
        when {
            state.loading -> LoadingState(Modifier.padding(padding))
            product == null -> Box(Modifier.padding(padding).fillMaxSize(), Alignment.Center) {
                Text("Product not found")
            }
            else -> ProductContent(
                product = product,
                related = state.related,
                onProductClick = onProductClick,
                modifier = Modifier.padding(padding),
            )
        }
    }
}

@Composable
private fun ProductContent(
    product: Product,
    related: List<Product>,
    onProductClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(modifier = modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            Box(
                Modifier.fillMaxWidth().height(300.dp).background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                NetworkImage(
                    url = product.imageUrl,
                    contentDescription = product.name,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxWidth().height(300.dp).padding(16.dp),
                )
            }
        }
        item {
            Column(Modifier.padding(16.dp)) {
                CategoryPill(product.category)
                Text(
                    product.name,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp),
                )
                if (product.sku.isNotBlank()) {
                    Text(
                        "SKU: ${product.sku}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
        }

        if (product.benefits.isNotEmpty()) {
            item { DetailSection("Product Benefits") }
            item {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    product.benefits.forEach { benefit ->
                        Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.Top) {
                            Icon(
                                Icons.Filled.CheckCircle, contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp).padding(top = 2.dp),
                            )
                            Text(benefit, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(start = 10.dp))
                        }
                    }
                }
            }
        }

        val descBody = product.description
            .lineSequence()
            .filterNot { line -> line.isBlank() || Regex("^\\s*\\d+\\s?ml").containsMatchIn(line) || line.trim().lowercase() in setOf("size", "inner carton", "master carton") }
            .joinToString("\n")
            .trim()
        if (descBody.isNotBlank() && descBody != product.shortDescription) {
            item { DetailSection("Description") }
            item {
                Text(
                    descBody,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }
        }

        if (product.packaging.isNotEmpty()) {
            item { DetailSection("Specifications & Packaging") }
            item { PackagingTable(product.packaging) }
        }

        item { DetailSection("Applications") }
        item {
            LazyRowChips(product.applications)
        }

        item { DetailSection("Certifications") }
        item { CertificationsCard() }

        if (related.isNotEmpty()) {
            item { DetailSection("Related Products") }
            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(related, key = { it.id }) { rel ->
                        ProductCard(product = rel, onClick = { onProductClick(rel.id) }, modifier = Modifier.width(160.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailSection(title: String) {
    Text(
        title,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 18.dp, bottom = 8.dp),
    )
}

@Composable
private fun PackagingTable(rows: List<Packaging>) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(Modifier.padding(vertical = 4.dp)) {
            Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                TableCell("Size", Modifier.weight(1.4f), header = true)
                TableCell("Inner Carton", Modifier.weight(1f), header = true)
                TableCell("Master Carton", Modifier.weight(1f), header = true)
            }
            HorizontalDivider()
            rows.forEachIndexed { index, row ->
                Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                    TableCell(row.size, Modifier.weight(1.4f))
                    TableCell(row.innerCarton, Modifier.weight(1f))
                    TableCell(row.masterCarton, Modifier.weight(1f))
                }
                if (index < rows.lastIndex) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            }
        }
    }
}

@Composable
private fun TableCell(text: String, modifier: Modifier, header: Boolean = false) {
    Text(
        text,
        modifier = modifier,
        style = if (header) MaterialTheme.typography.labelLarge else MaterialTheme.typography.bodyMedium,
        fontWeight = if (header) FontWeight.Bold else FontWeight.Normal,
    )
}

@Composable
private fun LazyRowChips(items: List<String>) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(items) { app ->
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.secondaryContainer,
            ) {
                Text(
                    app,
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun CertificationsCard() {
    val certs = listOf(
        "ISO Certified since 2007",
        "Meets ASTM & ANSI standards",
        "NSF-grade potable-water safety",
        "Each batch tested — reports available",
    )
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(Modifier.padding(16.dp)) {
            certs.forEach { c ->
                Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.WorkspacePremium, contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp),
                    )
                    Text(
                        c, style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(start = 10.dp),
                    )
                }
            }
        }
    }
}
