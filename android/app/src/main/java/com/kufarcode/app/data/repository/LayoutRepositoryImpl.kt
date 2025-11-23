package com.kufarcode.app.data.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.data.mapper.toDomain
import com.kufarcode.app.data.remote.api.LayoutApi
import com.kufarcode.app.domain.model.CityLayout
import com.kufarcode.app.domain.repository.LayoutRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class LayoutRepositoryImpl @Inject constructor(private val api: LayoutApi) : LayoutRepository {
    override fun getLayout(cityCode: String, screen: String, variant: String?): Flow<Result<CityLayout>> = flow {
        emit(Result.Loading)
        try {
            val layout = api.getLayout(cityCode, screen, variant).toDomain()
            emit(Result.Success(layout))
        } catch (t: Throwable) {
            emit(Result.Error(t))
        }
    }
}
