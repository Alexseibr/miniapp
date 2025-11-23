package com.kufarcode.app.data.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.data.mapper.toDomain
import com.kufarcode.app.data.remote.api.CityApi
import com.kufarcode.app.domain.model.City
import com.kufarcode.app.domain.repository.CityRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class CityRepositoryImpl @Inject constructor(private val api: CityApi) : CityRepository {
    override fun getCity(code: String): Flow<Result<City>> = flow {
        emit(Result.Loading)
        try {
            emit(Result.Success(api.getCity(code).toDomain()))
        } catch (t: Throwable) {
            emit(Result.Error(t))
        }
    }

    override fun getCities(): Flow<Result<List<City>>> = flow {
        emit(Result.Loading)
        try {
            emit(Result.Success(api.getCities().map { it.toDomain() }))
        } catch (t: Throwable) {
            emit(Result.Error(t))
        }
    }
}
