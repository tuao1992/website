package com.weldrite.app.ui.screens.dealers

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.weldrite.app.core.ContactActions
import com.weldrite.app.data.model.Dealer
import com.weldrite.app.ui.components.EmptyState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DealersScreen(
    onBecomeDistributor: () -> Unit,
    viewModel: DealersViewModel = viewModel(factory = DealersViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Dealers & Distributors") })
        },
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                item {
                    Card(
                        Modifier.fillMaxWidth().padding(16.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                    ) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Outlined.Storefront, contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(38.dp),
                            )
                            Column(Modifier.padding(start = 14.dp).weight(1f)) {
                                Text(
                                    "200+ distributors across India",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                                Text(
                                    "Find your nearest Weldrite desk or join our distribution network.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f),
                                )
                            }
                        }
                    }
                }
                item {
                    OutlinedTextField(
                        value = state.query,
                        onValueChange = viewModel::setQuery,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        placeholder = { Text("Search by city or state…") },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                        trailingIcon = {
                            if (state.query.isNotEmpty()) {
                                IconButton(onClick = { viewModel.setQuery("") }) {
                                    Icon(Icons.Filled.Close, contentDescription = "Clear")
                                }
                            }
                        },
                        singleLine = true,
                    )
                }
                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        item {
                            FilterChip(
                                selected = state.selectedState == null,
                                onClick = { viewModel.selectState(null) },
                                label = { Text("All India") },
                            )
                        }
                        items(state.states) { st ->
                            FilterChip(
                                selected = state.selectedState == st,
                                onClick = { viewModel.selectState(if (state.selectedState == st) null else st) },
                                label = { Text(st) },
                            )
                        }
                    }
                }
                items(state.dealers, key = { it.name }) { dealer ->
                    DealerCard(
                        dealer = dealer,
                        onCall = { ContactActions.dial(context, dealer.phone) },
                        onWhatsApp = {
                            ContactActions.whatsapp(
                                context, dealer.whatsapp,
                                "Hi Weldrite, I'd like to connect with the ${dealer.city} desk.",
                            )
                        },
                        onDirections = { ContactActions.openMaps(context, "${dealer.name}, ${dealer.address}", dealer.lat, dealer.lng) },
                    )
                }
                item {
                    Surface(
                        onClick = onBecomeDistributor,
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.primary,
                    ) {
                        Column(Modifier.padding(18.dp)) {
                            Text("Become a Distributor", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                            Text(
                                "Partner with Weldrite and grow with a trusted, ISO-certified brand.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f),
                            )
                        }
                    }
                }
            }
            if (state.dealers.isEmpty()) EmptyState("No desks found for this filter.")
        }
    }
}

@Composable
private fun DealerCard(
    dealer: Dealer,
    onCall: () -> Unit,
    onWhatsApp: () -> Unit,
    onDirections: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(dealer.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (dealer.isHeadOffice) {
                    AssistChip(
                        onClick = {},
                        label = { Text("HQ") },
                        colors = AssistChipDefaults.assistChipColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer),
                    )
                }
            }
            Text(dealer.type, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.Top) {
                Icon(Icons.Outlined.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    dealer.address,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 6.dp),
                )
            }
            Row(
                Modifier.fillMaxWidth().padding(top = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ActionPill("Call", Icons.Filled.Call, Modifier.weight(1f), onCall)
                ActionPill("WhatsApp", Icons.AutoMirrored.Outlined.Chat, Modifier.weight(1f), onWhatsApp)
                ActionPill("Directions", Icons.Filled.Directions, Modifier.weight(1f), onDirections)
            }
        }
    }
}

@Composable
private fun ActionPill(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.secondaryContainer,
    ) {
        Column(
            Modifier.padding(vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(icon, contentDescription = label, tint = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.size(20.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer, modifier = Modifier.padding(top = 2.dp))
        }
    }
}
