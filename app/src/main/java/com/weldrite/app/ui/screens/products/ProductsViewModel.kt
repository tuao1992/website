package com.weldrite.app.ui.screens.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.core.container
import com.weldrite.app.data.model.Product
import com.weldrite.app.data.model.ProductCategory
import com.weldrite.app.data.repository.WeldriteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class SortOption(val label: String) {
    NAME_ASC("Name (A–Z)"),
    NAME_DESC("Name (Z–A)"),
    CATEGORY("Category"),
    NEWEST("Newest"),
}

data class ProductsUiState(
    val categories: List<ProductCategory> = emptyList(),
    val visible: List<Product> = emptyList(),
    val query: String = "",
    val selectedCategory: String? = null,
    val sort: SortOption = SortOption.NAME_ASC,
    val totalCount: Int = 0,
    val loading: Boolean = true,
)

class ProductsViewModel(private val repo: WeldriteRepository) : ViewModel() {

    private val query = MutableStateFlow("")
    private val category = MutableStateFlow<String?>(null)
    private val sort = MutableStateFlow(SortOption.NAME_ASC)

    val isRefreshing = MutableStateFlow(false)

    val uiState: StateFlow<ProductsUiState> = combine(
        repo.observeProducts(), repo.observeCategories(), query, category, sort,
    ) { products, categories, q, cat, sortOption ->
        val filtered = products
            .filter { cat == null || it.category.equals(cat, ignoreCase = true) || it.categories.any { c -> c.equals(cat, true) } }
            .filter { p ->
                q.isBlank() ||
                    p.name.contains(q, true) ||
                    p.category.contains(q, true) ||
                    p.shortDescription.contains(q, true) ||
                    p.benefits.any { it.contains(q, true) }
            }
        val sorted = when (sortOption) {
            SortOption.NAME_ASC -> filtered.sortedBy { it.name.lowercase() }
            SortOption.NAME_DESC -> filtered.sortedByDescending { it.name.lowercase() }
            SortOption.CATEGORY -> filtered.sortedBy { it.category }
            SortOption.NEWEST -> filtered.sortedByDescending { it.id }
        }
        ProductsUiState(
            categories = categories,
            visible = sorted,
            query = q,
            selectedCategory = cat,
            sort = sortOption,
            totalCount = products.size,
            loading = false,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProductsUiState())

    fun setQuery(value: String) { query.value = value }
    fun selectCategory(value: String?) { category.value = value }
    fun setSort(value: SortOption) { sort.value = value }

    fun refresh() {
        viewModelScope.launch {
            isRefreshing.value = true
            repo.refresh()
            isRefreshing.value = false
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { ProductsViewModel(container.repository) }
        }
    }
}
