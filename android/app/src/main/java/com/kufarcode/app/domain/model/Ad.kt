package com.kufarcode.app.domain.model

data class Ad(
    val id: String,
    val title: String,
    val description: String?,
    val price: Double?,
    val currency: String?,
    val cityCode: String?,
    val imageUrl: String?,
    val latitude: Double?,
    val longitude: Double?,
    val seasonCode: String?
)
