package com.kufarcode.app.domain.repository

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.domain.model.CityLayout
import kotlinx.coroutines.flow.Flow

interface LayoutRepository {
    fun getLayout(cityCode: String, screen: String, variant: String? = null): Flow<Result<CityLayout>>
}
