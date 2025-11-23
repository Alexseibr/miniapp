package com.kufarcode.mobile.data.models

data class City(
    val code: String,
    val name: String,
    val theme: Theme? = null,
    val modules: List<String> = emptyList()
) {
    data class Theme(
        val primaryColor: String?,
        val logoUrl: String?
    )
}
