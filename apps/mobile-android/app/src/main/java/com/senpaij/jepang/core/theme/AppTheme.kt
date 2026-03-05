package com.senpaij.jepang.core.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

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
    error = SenpaiError,
)

private val SenpaiDarkColorScheme = darkColorScheme(
    primary = SenpaiGreen,
    onPrimary = SenpaiNavy,
    secondary = SenpaiGreenDark,
    background = SenpaiNavy,
    onBackground = SenpaiSurface,
    surface = SenpaiSlate,
    onSurface = SenpaiSurface,
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
