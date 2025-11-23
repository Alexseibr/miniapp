package com.kufarcode.app.data.remote.dto

data class AdDto(
    val id: String,
    val title: String,
    val description: String?,
    val price: Double?,
    val currency: String?,
    val cityCode: String?,
    val imageUrl: String?,
    val location: LocationDto?,
    val seasonCode: String?
)

data class LocationDto(
    val lat: Double?,
    val lng: Double?
)
