package com.kufarcode.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF2C7BE5),
    secondary = Color(0xFF05C46B)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF6CA8FF),
    secondary = Color(0xFF0BE282)
)

@Composable
fun KufarTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = androidx.compose.material3.Typography(),
        content = content
    )
}
