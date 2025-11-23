package com.kufarcode.app.core.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun KufarTheme(primaryColor: String?, content: @Composable () -> Unit) {
    val primary = primaryColor?.let { Color(android.graphics.Color.parseColor(it)) } ?: MaterialTheme.colorScheme.primary
    val colorScheme = lightColorScheme(primary = primary)
    MaterialTheme(colorScheme = colorScheme, content = content)
}
