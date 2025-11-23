package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.ContentRepository

class GetContentSlotUseCase(private val repository: ContentRepository) {
    operator fun invoke(slotId: String) = repository.getSlot(slotId)
}
