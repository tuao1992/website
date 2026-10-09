package com.weldrite.app.ui.screens.about

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.weldrite.app.core.container
import com.weldrite.app.data.model.CompanyInfo
import com.weldrite.app.data.model.ContactInfo
import com.weldrite.app.data.repository.WeldriteRepository

/** Shared, read-only company/brand info for the About & Certifications screens. */
class CompanyViewModel(repo: WeldriteRepository) : ViewModel() {
    val company: CompanyInfo = repo.company
    val contact: ContactInfo = repo.contact

    companion object {
        val Factory = viewModelFactory {
            initializer { CompanyViewModel(container.repository) }
        }
    }
}
