package com.kufarcode.mobile

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.kufarcode.mobile.data.api.AdsApi
import com.kufarcode.mobile.data.api.CityApi
import com.kufarcode.mobile.data.api.LayoutApi
import com.kufarcode.mobile.data.local.PreferenceStorage
import com.kufarcode.mobile.data.network.ApiClient
import com.kufarcode.mobile.data.repository.AdsRepository
import com.kufarcode.mobile.data.repository.CityRepository
import com.kufarcode.mobile.data.repository.LayoutRepository
import com.kufarcode.mobile.domain.LoadHomeLayoutUseCase
import com.kufarcode.mobile.domain.LoadTrendingAdsUseCase
import com.kufarcode.mobile.ui.screens.AdDetailsScreen
import com.kufarcode.mobile.ui.screens.CitySelectorScreen
import com.kufarcode.mobile.ui.screens.FavoritesScreen
import com.kufarcode.mobile.ui.screens.HomeScreen
import com.kufarcode.mobile.ui.screens.MapScreen
import com.kufarcode.mobile.ui.theme.KufarTheme
import com.kufarcode.mobile.ui.viewmodel.AdDetailsViewModel
import com.kufarcode.mobile.ui.viewmodel.CitySelectorViewModel
import com.kufarcode.mobile.ui.viewmodel.HomeViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            KufarTheme {
                AppRoot(intent?.data)
            }
        }
    }
}

@Composable
fun AppRoot(deepLink: Uri?) {
    val navController = rememberNavController()
    val adsRepository = remember { AdsRepository(ApiClient.create(AdsApi::class.java)) }
    val cityRepository = remember { CityRepository(ApiClient.create(CityApi::class.java)) }
    val layoutRepository = remember { LayoutRepository(ApiClient.create(LayoutApi::class.java)) }

    val homeViewModel = remember { HomeViewModel(LoadHomeLayoutUseCase(layoutRepository), LoadTrendingAdsUseCase(adsRepository)) }
    val citySelectorViewModel = remember { CitySelectorViewModel(cityRepository) }
    val adDetailsViewModel = remember { AdDetailsViewModel(adsRepository) }

    val handledDeepLink = remember { mutableStateOf(false) }

    if (deepLink != null && !handledDeepLink.value) {
        when (deepLink.pathSegments.firstOrNull()) {
            "open" -> {
                val id = deepLink.lastPathSegment
                if (id != null) {
                    navController.navigate("ad/$id")
                }
            }
        }
        handledDeepLink.value = true
    }

    NavHost(navController = navController, startDestination = if (PreferenceStorage.isFirstLaunch) "citySelector" else "home") {
        composable("home") { HomeScreen(homeViewModel) }
        composable("citySelector") {
            CitySelectorScreen(viewModel = citySelectorViewModel) {
                PreferenceStorage.isFirstLaunch = false
                navController.navigate("home") { popUpTo("citySelector") { inclusive = true } }
            }
        }
        composable("favorites") { FavoritesScreen() }
        composable("map") { MapScreen() }
        composable(
            route = "ad/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { backStackEntry ->
            val adId = backStackEntry.arguments?.getString("id") ?: return@composable
            AdDetailsScreen(viewModel = adDetailsViewModel, adId = adId)
        }
    }
}
