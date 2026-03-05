package com.senpaij.jepang.core.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val SenpaiLightColorScheme = lightColorScheme(
    primary = SenpaiGreen,
    onPrimary = SenpaiSurface,
    primaryContainer = SenpaiGreenLight,
    onPrimaryContainer = SenpaiNavy,
    secondary = SenpaiSlate,
    onSecondary = SenpaiSurface,
    background = SenpaiBackground,
    onBackground = SenpaiNavy,
    surface = SenpaiSurface,
    onSurface = SenpaiNavy,
    surfaceVariant = Color(0xFFF0F3F2),
    onSurfaceVariant = SenpaiSlate,
    outline = SenpaiGray,
    error = SenpaiError,
)

private val SenpaiDarkColorScheme = darkColorScheme(
    primary = SenpaiGreen,
    onPrimary = SenpaiNavy,
    secondary = SenpaiGreenDark,
    background = Color(0xFF121413),
    onBackground = SenpaiSurface,
    surface = Color(0xFF1A1F1C),
    onSurface = SenpaiSurface,
    surfaceVariant = Color(0xFF2A312D),
    onSurfaceVariant = Color(0xFFB6C0B9),
    outline = Color(0xFF3A443E),
    error = SenpaiError,
)

@Composable
fun SenpaiJepangTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) {
        SenpaiDarkColorScheme
    } else {
        SenpaiLightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = SenpaiTypography,
        content = content,
    )
}
