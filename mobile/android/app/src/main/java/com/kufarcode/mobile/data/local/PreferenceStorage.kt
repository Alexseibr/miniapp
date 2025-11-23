package com.kufarcode.mobile.data.local

import android.content.Context
import android.content.SharedPreferences

object PreferenceStorage {
    private const val PREFS_NAME = "kufar_code_prefs"
    private const val KEY_CITY = "city_code"
    private const val KEY_FAVORITES = "favorites"
    private const val KEY_FIRST_LAUNCH = "first_launch"

    private lateinit var prefs: SharedPreferences

    fun initialize(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    var cityCode: String
        get() = prefs.getString(KEY_CITY, "brest") ?: "brest"
        set(value) { prefs.edit().putString(KEY_CITY, value).apply() }

    var isFirstLaunch: Boolean
        get() = prefs.getBoolean(KEY_FIRST_LAUNCH, true)
        set(value) { prefs.edit().putBoolean(KEY_FIRST_LAUNCH, value).apply() }

    var favorites: Set<String>
        get() = prefs.getStringSet(KEY_FAVORITES, emptySet()) ?: emptySet()
        set(value) { prefs.edit().putStringSet(KEY_FAVORITES, value).apply() }
}
