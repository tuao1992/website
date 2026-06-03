package com.weldrite.app.ui.screens.distributor

import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.core.container
import com.weldrite.app.data.model.ContactInfo
import com.weldrite.app.data.repository.WeldriteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Mirrors the website's "Become a Distributor" form fields. */
data class DistributorForm(
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val phone: String = "",
    val gstin: String = "",
    val address: String = "",
    val state: String = "",
    val pincode: String = "",
    val description: String = "",
    val firstNameError: String? = null,
    val emailError: String? = null,
    val phoneError: String? = null,
    val pincodeError: String? = null,
)

class DistributorViewModel(repo: WeldriteRepository) : ViewModel() {

    val contact: ContactInfo = repo.contact

    private val _form = MutableStateFlow(DistributorForm())
    val form: StateFlow<DistributorForm> = _form.asStateFlow()

    fun setFirstName(v: String) = update { it.copy(firstName = v, firstNameError = null) }
    fun setLastName(v: String) = update { it.copy(lastName = v) }
    fun setEmail(v: String) = update { it.copy(email = v.trim(), emailError = null) }
    fun setPhone(v: String) = update { it.copy(phone = v.filter { c -> c.isDigit() || c == '+' }, phoneError = null) }
    fun setGstin(v: String) = update { it.copy(gstin = v.uppercase()) }
    fun setAddress(v: String) = update { it.copy(address = v) }
    fun setState(v: String) = update { it.copy(state = v) }
    fun setPincode(v: String) = update { it.copy(pincode = v.filter { c -> c.isDigit() }.take(6), pincodeError = null) }
    fun setDescription(v: String) = update { it.copy(description = v) }

    fun validateAndCompose(): String? {
        val f = _form.value
        val digits = f.phone.filter { it.isDigit() }.takeLast(10)
        val firstNameError = if (f.firstName.isBlank()) "First name is required" else null
        val emailError = when {
            f.email.isBlank() -> "Email is required"
            !Patterns.EMAIL_ADDRESS.matcher(f.email).matches() -> "Enter a valid email"
            else -> null
        }
        val phoneError = when {
            f.phone.isBlank() -> "Phone number is required"
            digits.length != 10 || digits.first() !in '6'..'9' -> "Enter a valid 10-digit number"
            else -> null
        }
        val pincodeError = if (f.pincode.isNotBlank() && f.pincode.length != 6) "Pincode must be 6 digits" else null

        if (firstNameError != null || emailError != null || phoneError != null || pincodeError != null) {
            _form.value = f.copy(
                firstNameError = firstNameError, emailError = emailError,
                phoneError = phoneError, pincodeError = pincodeError,
            )
            return null
        }
        return buildString {
            appendLine("Weldrite — Become a Distributor")
            appendLine("──────────────")
            appendLine("Name: ${f.firstName} ${f.lastName}".trim())
            appendLine("Email: ${f.email}")
            appendLine("Phone: ${f.phone}")
            if (f.gstin.isNotBlank()) appendLine("Company GSTIN: ${f.gstin}")
            if (f.address.isNotBlank()) appendLine("Address: ${f.address}")
            if (f.state.isNotBlank()) appendLine("State: ${f.state}")
            if (f.pincode.isNotBlank()) appendLine("Pincode: ${f.pincode}")
            if (f.description.isNotBlank()) {
                appendLine("──────────────")
                appendLine("Details:")
                append(f.description)
            }
        }
    }

    fun reset() { _form.value = DistributorForm() }

    private inline fun update(block: (DistributorForm) -> DistributorForm) { _form.value = block(_form.value) }

    companion object {
        val Factory = viewModelFactory {
            initializer { DistributorViewModel(container.repository) }
        }
    }
}
