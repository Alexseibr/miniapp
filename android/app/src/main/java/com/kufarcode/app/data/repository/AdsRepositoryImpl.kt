package com.kufarcode.app.data.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.data.mapper.toDomain
import com.kufarcode.app.data.remote.api.AdsApi
import com.kufarcode.app.domain.model.Ad
import com.kufarcode.app.domain.repository.AdsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class AdsRepositoryImpl @Inject constructor(private val api: AdsApi) : AdsRepository {
    override fun getTrending(cityCode: String): Flow<Result<List<Ad>>> = flow {
        emit(Result.Loading)
        try {
            emit(Result.Success(api.getTrending(cityCode).map { it.toDomain() }))
        } catch (t: Throwable) {
            emit(Result.Error(t))
        }
    }

    override fun getNearby(lat: Double, lng: Double, radiusKm: Double, categoryId: String?): Flow<Result<List<Ad>>> = flow {
        emit(Result.Loading)
        try {
            emit(Result.Success(api.getNearby(lat, lng, radiusKm, categoryId).map { it.toDomain() }))
        } catch (t: Throwable) {
            emit(Result.Error(t))
        }
    }

    override fun getBySeason(seasonCode: String): Flow<Result<List<Ad>>> = flow {
        emit(Result.Loading)
        try {
            emit(Result.Success(api.getBySeason(seasonCode).map { it.toDomain() }))
        } catch (t: Throwable) {
            emit(Result.Error(t))
        }
    }
}
