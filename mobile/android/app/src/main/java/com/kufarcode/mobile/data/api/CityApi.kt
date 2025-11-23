package com.kufarcode.mobile.data.api

import com.kufarcode.mobile.data.models.City
import retrofit2.http.GET
import retrofit2.http.Path

interface CityApi {
    @GET("/api/city/{code}")
    suspend fun getCity(@Path("code") code: String): City

    @GET("/api/city")
    suspend fun getAll(): List<City>
}
