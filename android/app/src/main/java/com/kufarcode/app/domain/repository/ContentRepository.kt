package com.kufarcode.app.domain.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.domain.model.ContentSlot
import kotlinx.coroutines.flow.Flow

interface ContentRepository {
    fun getSlot(slotId: String): Flow<Result<ContentSlot>>
}
