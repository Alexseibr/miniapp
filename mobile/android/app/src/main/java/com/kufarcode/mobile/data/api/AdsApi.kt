package com.kufarcode.mobile.data.api

import com.kufarcode.mobile.data.models.Ad
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface AdsApi {
    @GET("/api/ads/trending")
    suspend fun getTrending(@Query("cityCode") cityCode: String): List<Ad>

    @GET("/api/ads/nearby")
    suspend fun getNearby(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radiusKm") radiusKm: Double,
        @Query("categoryId") categoryId: String? = null
    ): List<Ad>

    @GET("/api/ads")
    suspend fun getBySeason(@Query("seasonCode") seasonCode: String): List<Ad>

    @GET("/api/ads/{id}")
    suspend fun getById(@Path("id") id: String): Ad
}
