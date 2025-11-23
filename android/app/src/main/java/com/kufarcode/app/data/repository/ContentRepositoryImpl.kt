package com.kufarcode.app.data.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.data.mapper.toDomain
import com.kufarcode.app.data.remote.api.ContentApi
import com.kufarcode.app.domain.model.ContentSlot
import com.kufarcode.app.domain.repository.ContentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class ContentRepositoryImpl @Inject constructor(private val api: ContentApi) : ContentRepository {
    override fun getSlot(slotId: String): Flow<Result<ContentSlot>> = flow {
        emit(Result.Loading)
        try {
            emit(Result.Success(api.getSlot(slotId).toDomain()))
        } catch (t: Throwable) {
            emit(Result.Error(t))
        }
    }
}
