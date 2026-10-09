package com.weldrite.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.core.container
import com.weldrite.app.data.model.CompanyInfo
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.model.ProductCategory
import com.weldrite.app.data.repository.WeldriteRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class HomeUiState(
    val categories: List<ProductCategory> = emptyList(),
    val featured: List<Product> = emptyList(),
    val newLaunches: List<Product> = emptyList(),
    val loading: Boolean = true,
)

class HomeViewModel(private val repo: WeldriteRepository) : ViewModel() {

    val company: CompanyInfo = repo.company

    val uiState: StateFlow<HomeUiState> =
        combine(repo.observeProducts(), repo.observeCategories()) { products, categories ->
            HomeUiState(
                categories = categories,
                // Featured: one representative product per top category.
                featured = products.distinctBy { it.category }.take(6),
                // New launches: newest product ids first.
                newLaunches = products.sortedByDescending { it.id }.take(8),
                loading = false,
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    companion object {
        val Factory = viewModelFactory {
            initializer { HomeViewModel(container.repository) }
        }
    }
}
