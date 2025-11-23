package com.kufarcode.app.data.remote.api

import com.kufarcode.app.data.remote.dto.CityLayoutDto
import retrofit2.http.GET
import retrofit2.http.Query

interface LayoutApi {
    @GET("/api/layout")
    suspend fun getLayout(
        @Query("cityCode") cityCode: String,
        @Query("screen") screen: String,
        @Query("variant") variant: String? = null
    ): CityLayoutDto
}
