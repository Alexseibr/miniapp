package com.kufarcode.app.domain.usecase

import com.kufarcode.app.domain.repository.LayoutRepository

class GetHomeLayoutUseCase(private val repository: LayoutRepository) {
    operator fun invoke(cityCode: String, screen: String = "home", variant: String? = null) =
        repository.getLayout(cityCode, screen, variant)
}
