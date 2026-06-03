package com.weldrite.app.ui.screens.contact

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

enum class InquiryType(val label: String) {
    GENERAL("General"),
    PRODUCT("Product"),
    DEALER("Distributor"),
}

data class InquiryForm(
    val type: InquiryType = InquiryType.GENERAL,
    val name: String = "",
    val company: String = "",
    val mobile: String = "",
    val email: String = "",
    val city: String = "",
    val state: String = "",
    val message: String = "",
    // Field-level error messages (null = valid).
    val nameError: String? = null,
    val mobileError: String? = null,
    val emailError: String? = null,
    val messageError: String? = null,
)

class ContactViewModel(repo: WeldriteRepository) : ViewModel() {

    val contact: ContactInfo = repo.contact

    private val _form = MutableStateFlow(InquiryForm())
    val form: StateFlow<InquiryForm> = _form.asStateFlow()

    fun setType(type: InquiryType) = update { it.copy(type = type) }
    fun setName(v: String) = update { it.copy(name = v, nameError = null) }
    fun setCompany(v: String) = update { it.copy(company = v) }
    fun setMobile(v: String) = update { it.copy(mobile = v.filter { c -> c.isDigit() || c == '+' }, mobileError = null) }
    fun setEmail(v: String) = update { it.copy(email = v.trim(), emailError = null) }
    fun setCity(v: String) = update { it.copy(city = v) }
    fun setState(v: String) = update { it.copy(state = v) }
    fun setMessage(v: String) = update { it.copy(message = v, messageError = null) }

    /** Pre-fill the form for a product inquiry launched from a product page. */
    fun prefillProduct(productName: String) = update {
        it.copy(
            type = InquiryType.PRODUCT,
            message = if (it.message.isBlank())
                "I'm interested in \"$productName\". Please share details, pricing and availability."
            else it.message,
        )
    }

    /** Validates the form. Returns the composed inquiry text on success, else null. */
    fun validateAndCompose(): String? {
        val f = _form.value
        val digits = f.mobile.filter { it.isDigit() }.takeLast(10)
        val nameError = if (f.name.isBlank()) "Name is required" else null
        val mobileError = when {
            f.mobile.isBlank() -> "Mobile number is required"
            digits.length != 10 || digits.first() !in '6'..'9' -> "Enter a valid 10-digit mobile number"
            else -> null
        }
        val emailError = when {
            f.email.isBlank() -> "Email is required"
            !Patterns.EMAIL_ADDRESS.matcher(f.email).matches() -> "Enter a valid email address"
            else -> null
        }
        val messageError = if (f.message.isBlank()) "Message is required" else null

        if (nameError != null || mobileError != null || emailError != null || messageError != null) {
            _form.value = f.copy(
                nameError = nameError, mobileError = mobileError,
                emailError = emailError, messageError = messageError,
            )
            return null
        }
        return buildString {
            appendLine("Weldrite ${f.type.label} Inquiry")
            appendLine("──────────────")
            appendLine("Name: ${f.name}")
            if (f.company.isNotBlank()) appendLine("Company: ${f.company}")
            appendLine("Mobile: ${f.mobile}")
            appendLine("Email: ${f.email}")
            if (f.city.isNotBlank()) appendLine("City: ${f.city}")
            if (f.state.isNotBlank()) appendLine("State: ${f.state}")
            appendLine("──────────────")
            appendLine("Message:")
            append(f.message)
        }
    }

    fun reset() { _form.value = InquiryForm() }

    private inline fun update(block: (InquiryForm) -> InquiryForm) { _form.value = block(_form.value) }

    companion object {
        val Factory = viewModelFactory {
            initializer { ContactViewModel(container.repository) }
        }
    }
}
