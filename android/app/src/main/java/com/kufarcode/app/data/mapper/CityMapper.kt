package com.kufarcode.app.data.mapper

import com.kufarcode.app.data.remote.dto.CityDto
import com.kufarcode.app.domain.model.City
import com.kufarcode.app.domain.model.CityFeatureFlags
import com.kufarcode.app.domain.model.CityTheme

fun CityDto.toDomain() = City(
    code = code,
    name = name,
    theme = CityTheme(
        primaryColor = theme.primaryColor,
        secondaryColor = theme.secondaryColor,
        logoUrl = theme.logoUrl
    ),
    features = CityFeatureFlags(
        enableMap = features.enableMap ?: true,
        enableFavorites = features.enableFavorites ?: true,
        experimentalLayout = features.experimentalLayout ?: false
    )
)
