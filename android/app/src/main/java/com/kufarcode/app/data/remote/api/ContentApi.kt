package com.kufarcode.app.data.remote.api

import com.kufarcode.app.data.remote.dto.ContentSlotDto
import retrofit2.http.GET
import retrofit2.http.Path

interface ContentApi {
    @GET("/api/content/slot/{slotId}")
    suspend fun getSlot(@Path("slotId") slotId: String): ContentSlotDto
}
