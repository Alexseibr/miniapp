package com.kufarcode.app.data.mapper

import com.kufarcode.app.data.remote.dto.CityLayoutDto
import com.kufarcode.app.data.remote.dto.LayoutBlockDto
import com.kufarcode.app.domain.model.CityLayout
import com.kufarcode.app.domain.model.LayoutBlock
import com.kufarcode.app.domain.model.LayoutBlockType

fun CityLayoutDto.toDomain(): CityLayout = CityLayout(
    cityCode = cityCode,
    screen = screen,
    blocks = blocks.map { it.toDomain() }
)

fun LayoutBlockDto.toDomain(): LayoutBlock = LayoutBlock(
    id = id,
    type = LayoutBlockType.valueOf(type.uppercase()),
    slotId = slotId,
    title = title,
    categoryIds = categoryIds ?: emptyList(),
    source = source,
    limit = limit,
    metadata = metadata ?: emptyMap()
)
