package com.weldrite.app.core

import android.content.Context
import com.weldrite.app.data.repository.FileDownloader
import com.weldrite.app.data.repository.WeldriteRepository

/**
 * Manual dependency-injection container (lightweight alternative to Hilt) that
 * owns the app-scoped singletons. Constructed once in [com.weldrite.app.WeldriteApp].
 */
class AppContainer(context: Context) {
    private val appContext = context.applicationContext

    val repository: WeldriteRepository by lazy { WeldriteRepository(appContext) }
    val fileDownloader: FileDownloader by lazy { FileDownloader(appContext) }
}
