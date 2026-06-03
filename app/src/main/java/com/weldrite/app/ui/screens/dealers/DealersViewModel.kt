package com.weldrite.app.ui.screens.dealers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.core.container
import com.weldrite.app.data.model.Dealer
import com.weldrite.app.data.model.DealerDirectory
import com.weldrite.app.data.repository.WeldriteRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn

data class DealersUiState(
    val dealers: List<Dealer> = emptyList(),
    val states: List<String> = emptyList(),
    val selectedState: String? = null,
    val query: String = "",
)

class DealersViewModel(repo: WeldriteRepository) : ViewModel() {

    private val all: List<Dealer> = DealerDirectory.build(repo.contact)
    private val selectedState = MutableStateFlow<String?>(null)
    private val query = MutableStateFlow("")

    val uiState: StateFlow<DealersUiState> = combine(selectedState, query) { state, q ->
        val filtered = all
            .filter { state == null || it.state == state }
            .filter { q.isBlank() || it.city.contains(q, true) || it.state.contains(q, true) || it.name.contains(q, true) }
            // Head office always first, then alphabetical by city.
            .sortedWith(compareByDescending<Dealer> { it.isHeadOffice }.thenBy { it.city })
        DealersUiState(
            dealers = filtered,
            states = all.map { it.state }.distinct().sorted(),
            selectedState = state,
            query = q,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DealersUiState(states = all.map { it.state }.distinct().sorted()))

    fun selectState(state: String?) { selectedState.value = state }
    fun setQuery(value: String) { query.value = value }

    companion object {
        val Factory = viewModelFactory {
            initializer { DealersViewModel(container.repository) }
        }
    }
}
