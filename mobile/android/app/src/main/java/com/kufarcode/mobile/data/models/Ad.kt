package com.kufarcode.mobile.data.models

data class Ad(
    val id: String,
    val title: String,
    val price: String?,
    val imageUrl: String?,
    val description: String? = null,
    val cityCode: String? = null,
    val seasonCode: String? = null,
    val location: GeoPoint? = null
)

data class GeoPoint(
    val type: String = "Point",
    val coordinates: List<Double> = emptyList()
)
