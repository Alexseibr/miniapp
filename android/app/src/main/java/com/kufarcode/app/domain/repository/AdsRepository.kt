package com.kufarcode.app.domain.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.domain.model.Ad
import kotlinx.coroutines.flow.Flow

interface AdsRepository {
    fun getTrending(cityCode: String): Flow<Result<List<Ad>>>
    fun getNearby(lat: Double, lng: Double, radiusKm: Double, categoryId: String? = null): Flow<Result<List<Ad>>>
    fun getBySeason(seasonCode: String): Flow<Result<List<Ad>>>
}
