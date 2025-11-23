package com.kufarcode.app.data.remote.dto

data class CityDto(
    val code: String,
    val name: String,
    val theme: CityThemeDto,
    val features: CityFeatureFlagsDto
)

data class CityThemeDto(
    val primaryColor: String,
    val secondaryColor: String?,
    val logoUrl: String?
)

data class CityFeatureFlagsDto(
    val enableMap: Boolean?,
    val enableFavorites: Boolean?,
    val experimentalLayout: Boolean?
)
