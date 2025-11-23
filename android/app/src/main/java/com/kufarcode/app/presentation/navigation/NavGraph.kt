package com.kufarcode.app.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.kufarcode.app.presentation.ad_detail.AdDetailScreen
import com.kufarcode.app.presentation.city.CitySelectorScreen
import com.kufarcode.app.presentation.favorites.FavoritesScreen
import com.kufarcode.app.presentation.home.HomeScreen
import com.kufarcode.app.presentation.map.MapScreen

sealed class Destinations(val route: String) {
    object Home : Destinations("home")
    object CitySelector : Destinations("citySelector")
    object Favorites : Destinations("favorites")
    object Map : Destinations("map")
    object AdDetail : Destinations("adDetail/{adId}") {
        fun createRoute(adId: String) = "adDetail/$adId"
    }
}

@Composable
fun AppNavGraph(modifier: Modifier = Modifier, startDestination: String = Destinations.Home.route, selectedCityCode: String?) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = startDestination, modifier = modifier) {
        composable(Destinations.Home.route) {
            HomeScreen(
                cityCode = selectedCityCode,
                onAdClick = { ad -> navController.navigate(Destinations.AdDetail.createRoute(ad.id)) },
                onSelectCity = { navController.navigate(Destinations.CitySelector.route) }
            )
        }
        composable(Destinations.CitySelector.route) {
            CitySelectorScreen(onCitySelected = { navController.popBackStack() })
        }
        composable(Destinations.Favorites.route) { FavoritesScreen() }
        composable(Destinations.Map.route) { MapScreen() }
        composable(
            route = Destinations.AdDetail.route,
            arguments = listOf(navArgument("adId") { type = NavType.StringType })
        ) {
            AdDetailScreen()
        }
    }
}
