package com.weldrite.app.ui.screens.contact

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.weldrite.app.core.ContactActions
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactScreen(
    product: String? = null,
    viewModel: ContactViewModel = viewModel(factory = ContactViewModel.Factory),
) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val contact = viewModel.contact
    val context = LocalContext.current
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    androidx.compose.runtime.LaunchedEffect(product) {
        if (!product.isNullOrBlank()) viewModel.prefillProduct(product)
    }

    fun submit(viaWhatsApp: Boolean) {
        val composed = viewModel.validateAndCompose()
        if (composed == null) {
            scope.launch { snackbar.showSnackbar("Please fix the highlighted fields") }
            return
        }
        if (viaWhatsApp) {
            ContactActions.whatsapp(context, contact.whatsapp, composed)
        } else {
            ContactActions.email(context, contact.email, "Weldrite ${form.type.label} Inquiry", composed)
        }
        viewModel.reset()
        scope.launch { snackbar.showSnackbar("Opening your ${if (viaWhatsApp) "WhatsApp" else "email"} to send the inquiry…") }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Contact Us") }) },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            Text("Get in touch — we'll help your business.", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

            QuickContact(
                onCall = { ContactActions.dial(context, contact.phone) },
                onWhatsApp = { ContactActions.whatsapp(context, contact.whatsapp, "Hi Weldrite team!") },
                onEmail = { ContactActions.email(context, contact.email, "Weldrite Enquiry") },
                onDirections = { ContactActions.openMaps(context, "Weldrite, ${contact.address}", contact.lat, contact.lng) },
            )

            InfoCard(contact.phoneDisplay, contact.email, contact.address, contact.hours)

            Text(
                "Send an Inquiry",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 20.dp, bottom = 8.dp),
            )

            TabRow(selectedTabIndex = form.type.ordinal) {
                InquiryType.entries.forEach { type ->
                    Tab(
                        selected = form.type == type,
                        onClick = { viewModel.setType(type) },
                        text = { Text(type.label) },
                    )
                }
            }

            Field("Full Name *", form.name, viewModel::setName, error = form.nameError, imeAction = ImeAction.Next)
            Field("Company Name", form.company, viewModel::setCompany, imeAction = ImeAction.Next)
            Field("Mobile Number *", form.mobile, viewModel::setMobile, error = form.mobileError, keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next)
            Field("Email *", form.email, viewModel::setEmail, error = form.emailError, keyboardType = KeyboardType.Email, imeAction = ImeAction.Next)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.weight(1f)) { Field("City", form.city, viewModel::setCity, imeAction = ImeAction.Next) }
                Box(Modifier.weight(1f)) { Field("State", form.state, viewModel::setState, imeAction = ImeAction.Next) }
            }
            Field("Message *", form.message, viewModel::setMessage, error = form.messageError, singleLine = false, minLines = 3, imeAction = ImeAction.Default)

            Button(onClick = { submit(viaWhatsApp = false) }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                Icon(Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("  Submit via Email")
            }
            OutlinedButton(onClick = { submit(viaWhatsApp = true) }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("  Submit via WhatsApp")
            }
            Text(
                "Your details are sent directly to the Weldrite team. We typically respond within 1 business day.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Field(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    error: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    singleLine: Boolean = true,
    minLines: Int = 1,
) {
    Column(Modifier.padding(top = 10.dp)) {
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            label = { Text(label) },
            isError = error != null,
            singleLine = singleLine,
            minLines = minLines,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        )
        if (error != null) {
            Text(error, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(start = 12.dp, top = 2.dp))
        }
    }
}

@Composable
private fun QuickContact(onCall: () -> Unit, onWhatsApp: () -> Unit, onEmail: () -> Unit, onDirections: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(top = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        QuickAction("Call", Icons.Filled.Call, Modifier.weight(1f), onCall)
        QuickAction("WhatsApp", Icons.AutoMirrored.Outlined.Chat, Modifier.weight(1f), onWhatsApp)
        QuickAction("Email", Icons.Filled.Email, Modifier.weight(1f), onEmail)
        QuickAction("Maps", Icons.Filled.Directions, Modifier.weight(1f), onDirections)
    }
}

@Composable
private fun QuickAction(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Surface(onClick = onClick, modifier = modifier, shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primaryContainer) {
        Column(Modifier.padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = label, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun InfoCard(phone: String, email: String, address: String, hours: String) {
    Card(
        Modifier.fillMaxWidth().padding(top = 14.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(Modifier.padding(16.dp)) {
            InfoRow(Icons.Filled.Call, phone)
            InfoRow(Icons.Filled.Email, email)
            InfoRow(Icons.Outlined.LocationOn, address)
            InfoRow(Icons.Outlined.Schedule, "Available $hours")
        }
    }
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.Top) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(start = 10.dp))
    }
}
