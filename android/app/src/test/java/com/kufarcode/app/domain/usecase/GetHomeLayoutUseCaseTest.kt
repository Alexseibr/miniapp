package com.kufarcode.app.domain.usecase

import com.kufarcode.app.core.util.Result
import com.kufarcode.app.domain.model.CityLayout
import com.kufarcode.app.domain.model.LayoutBlock
import com.kufarcode.app.domain.model.LayoutBlockType
import com.kufarcode.app.domain.repository.LayoutRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

private class FakeLayoutRepository : LayoutRepository {
    override fun getLayout(cityCode: String, screen: String, variant: String?): Flow<Result<CityLayout>> {
        val layout = CityLayout(cityCode, screen, listOf(LayoutBlock("1", LayoutBlockType.HERO_BANNER)))
        return flowOf(Result.Success(layout))
    }
}

class GetHomeLayoutUseCaseTest {
    @Test
    fun `returns layout from repository`() = runTest {
        val useCase = GetHomeLayoutUseCase(FakeLayoutRepository())
        val emissions = mutableListOf<Result<CityLayout>>()

        useCase("msk").collect { emissions.add(it) }

        val success = emissions.last() as Result.Success
        assertEquals("msk", success.data.cityCode)
    }
}
