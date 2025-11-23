package com.kufarcode.app.data.mapper

import com.kufarcode.app.data.remote.dto.ContentSlotDto
import com.kufarcode.app.domain.model.ContentSlot

fun ContentSlotDto.toDomain() = ContentSlot(
    id = id,
    title = title,
    imageUrl = imageUrl,
    actionUrl = actionUrl,
    payload = payload ?: emptyMap()
)
