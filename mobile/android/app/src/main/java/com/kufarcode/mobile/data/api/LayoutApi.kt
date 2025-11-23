package com.kufarcode.mobile.data.api

import com.kufarcode.mobile.data.models.CityLayout
import retrofit2.http.GET
import retrofit2.http.Query

interface LayoutApi {
    @GET("/api/layout")
    suspend fun getLayout(
        @Query("cityCode") cityCode: String,
        @Query("screen") screen: String,
        @Query("variant") variant: String? = null
    ): CityLayout
}
