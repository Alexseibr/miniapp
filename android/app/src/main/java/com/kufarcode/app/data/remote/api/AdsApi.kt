package com.kufarcode.app.data.remote.api

import com.kufarcode.app.data.remote.dto.AdDto
import retrofit2.http.GET
import retrofit2.http.Query
import retrofit2.http.Path

interface AdsApi {
    @GET("/api/ads/trending")
    suspend fun getTrending(@Query("cityCode") cityCode: String): List<AdDto>

    @GET("/api/ads/nearby")
    suspend fun getNearby(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radiusKm") radiusKm: Double,
        @Query("categoryId") categoryId: String? = null
    ): List<AdDto>

    @GET("/api/ads")
    suspend fun getBySeason(@Query("seasonCode") seasonCode: String): List<AdDto>
}
