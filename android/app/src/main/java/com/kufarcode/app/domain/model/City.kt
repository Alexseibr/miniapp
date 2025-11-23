package com.kufarcode.app.domain.model

data class City(
    val code: String,
    val name: String,
    val theme: CityTheme,
    val features: CityFeatureFlags
)

data class CityTheme(
    val primaryColor: String,
    val secondaryColor: String? = null,
    val logoUrl: String? = null
)

data class CityFeatureFlags(
    val enableMap: Boolean = true,
    val enableFavorites: Boolean = true,
    val experimentalLayout: Boolean = false
)
