package com.kufarcode.app.data.mapper

import com.kufarcode.app.data.remote.dto.AdDto
import com.kufarcode.app.domain.model.Ad

fun AdDto.toDomain() = Ad(
    id = id,
    title = title,
    description = description,
    price = price,
    currency = currency,
    cityCode = cityCode,
    imageUrl = imageUrl,
    latitude = location?.lat,
    longitude = location?.lng,
    seasonCode = seasonCode
)
