package com.weldrite.app.ui.screens.productdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.core.container
import com.weldrite.app.data.model.ContactInfo
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.repository.WeldriteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProductDetailUiState(
    val product: Product? = null,
    val related: List<Product> = emptyList(),
    val loading: Boolean = true,
)

class ProductDetailViewModel(private val repo: WeldriteRepository) : ViewModel() {

    val contact: ContactInfo = repo.contact

    private val _state = MutableStateFlow(ProductDetailUiState())
    val state: StateFlow<ProductDetailUiState> = _state.asStateFlow()

    fun load(id: Int) {
        if (_state.value.product?.id == id) return
        viewModelScope.launch {
            val product = repo.getProduct(id)
            val related = product?.let { repo.relatedProducts(it) } ?: emptyList()
            _state.value = ProductDetailUiState(product = product, related = related, loading = false)
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { ProductDetailViewModel(container.repository) }
        }
    }
}
