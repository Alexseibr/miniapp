package com.kufarcode.mobile.data.repository

import com.kufarcode.mobile.data.api.LayoutApi
import com.kufarcode.mobile.data.models.CityLayout

class LayoutRepository(private val api: LayoutApi) {
    suspend fun getHomeLayout(cityCode: String): CityLayout =
        api.getLayout(cityCode = cityCode, screen = "home")
}
