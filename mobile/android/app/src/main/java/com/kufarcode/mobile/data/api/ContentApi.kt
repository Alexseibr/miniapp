package com.kufarcode.mobile.data.api

import com.kufarcode.mobile.data.models.ContentSlot
import retrofit2.http.GET
import retrofit2.http.Path

interface ContentApi {
    @GET("/api/content/slot/{slotId}")
    suspend fun getSlot(@Path("slotId") slotId: String): ContentSlot
}
