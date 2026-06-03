package com.weldrite.app.core

import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewmodel.CreationExtras
import com.weldrite.app.WeldriteApp

/** Convenience accessor for the app container from inside a ViewModel factory. */
val CreationExtras.container: AppContainer
    get() = (this[APPLICATION_KEY] as WeldriteApp).container
