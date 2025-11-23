package com.kufarcode.mobile.data.repository

import com.kufarcode.mobile.data.api.AdsApi
import com.kufarcode.mobile.data.models.Ad

class AdsRepository(private val api: AdsApi) {
    suspend fun getTrending(cityCode: String): List<Ad> = api.getTrending(cityCode)

    suspend fun getNearby(lat: Double, lng: Double, radiusKm: Double, categoryId: String? = null): List<Ad> =
        api.getNearby(lat, lng, radiusKm, categoryId)

    suspend fun getBySeason(seasonCode: String): List<Ad> = api.getBySeason(seasonCode)

    suspend fun getById(id: String): Ad = api.getById(id)
}
