package com.weldrite.app.ui.screens.distributor

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.Handshake
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.weldrite.app.core.ContactActions
import com.weldrite.app.ui.components.FormField
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DistributorScreen(
    onBack: () -> Unit,
    viewModel: DistributorViewModel = viewModel(factory = DistributorViewModel.Factory),
) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val contact = viewModel.contact
    val context = LocalContext.current
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    fun submit(viaWhatsApp: Boolean) {
        val composed = viewModel.validateAndCompose()
        if (composed == null) {
            scope.launch { snackbar.showSnackbar("Please fix the highlighted fields") }
            return
        }
        if (viaWhatsApp) ContactActions.whatsapp(context, contact.whatsapp, composed)
        else ContactActions.email(context, contact.email, "Weldrite — Become a Distributor", composed)
        viewModel.reset()
        scope.launch { snackbar.showSnackbar("Sending your distributor application…") }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Become a Distributor") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Column(Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(16.dp)) {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Row(Modifier.padding(16.dp)) {
                    Icon(Icons.Outlined.Handshake, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(38.dp))
                    Column(Modifier.padding(start = 14.dp)) {
                        Text("Grow with Weldrite", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text(
                            "Join 200+ distributors. Strong margins, marketing support and a trusted, ISO-certified product range.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f),
                        )
                    }
                }
            }

            Text("Your Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FormField("First Name *", form.firstName, viewModel::setFirstName, Modifier.weight(1f), error = form.firstNameError)
                FormField("Last Name", form.lastName, viewModel::setLastName, Modifier.weight(1f))
            }
            FormField("Email *", form.email, viewModel::setEmail, error = form.emailError, keyboardType = KeyboardType.Email)
            FormField("Phone Number *", form.phone, viewModel::setPhone, error = form.phoneError, keyboardType = KeyboardType.Phone)
            FormField("Company GSTIN", form.gstin, viewModel::setGstin)
            FormField("Company Address", form.address, viewModel::setAddress)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FormField("State", form.state, viewModel::setState, Modifier.weight(1f))
                FormField("Pincode", form.pincode, viewModel::setPincode, Modifier.weight(1f), error = form.pincodeError, keyboardType = KeyboardType.Number)
            }
            FormField("Tell us about your business", form.description, viewModel::setDescription, singleLine = false, minLines = 3, imeAction = ImeAction.Default)

            Button(onClick = { submit(false) }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                Icon(Icons.Filled.Email, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("  Submit Application")
            }
            OutlinedButton(onClick = { submit(true) }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("  Apply via WhatsApp")
            }
        }
    }
}
