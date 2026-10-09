package com.weldrite.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = md_primary, onPrimary = md_onPrimary,
    primaryContainer = md_primaryContainer, onPrimaryContainer = md_onPrimaryContainer,
    secondary = md_secondary, onSecondary = md_onSecondary,
    secondaryContainer = md_secondaryContainer, onSecondaryContainer = md_onSecondaryContainer,
    tertiary = md_tertiary, onTertiary = md_onTertiary,
    tertiaryContainer = md_tertiaryContainer, onTertiaryContainer = md_onTertiaryContainer,
    background = md_background, onBackground = md_onBackground,
    surface = md_surface, onSurface = md_onSurface,
    surfaceVariant = md_surfaceVariant, onSurfaceVariant = md_onSurfaceVariant,
    surfaceContainer = md_surfaceContainer,
    outline = md_outline, outlineVariant = md_outlineVariant,
    error = md_error, onError = md_onError,
)

private val DarkColors = darkColorScheme(
    primary = md_dark_primary, onPrimary = md_dark_onPrimary,
    primaryContainer = md_dark_primaryContainer, onPrimaryContainer = md_dark_onPrimaryContainer,
    secondary = md_dark_secondary, onSecondary = md_dark_onSecondary,
    secondaryContainer = md_dark_secondaryContainer, onSecondaryContainer = md_dark_onSecondaryContainer,
    tertiary = md_dark_tertiary, onTertiary = md_dark_onTertiary,
    tertiaryContainer = md_dark_tertiaryContainer, onTertiaryContainer = md_dark_onTertiaryContainer,
    background = md_dark_background, onBackground = md_dark_onBackground,
    surface = md_dark_surface, onSurface = md_dark_onSurface,
    surfaceVariant = md_dark_surfaceVariant, onSurfaceVariant = md_dark_onSurfaceVariant,
    surfaceContainer = md_dark_surfaceContainer,
    outline = md_dark_outline, outlineVariant = md_dark_outlineVariant,
    error = md_dark_error, onError = md_dark_onError,
)

@Composable
fun WeldriteTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            // Top app bars use a light surface colour, so use dark status-bar icons
            // in light mode and light icons in dark mode.
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    MaterialTheme(
        colorScheme = colors,
        typography = WeldriteTypography,
        content = content,
    )
}
