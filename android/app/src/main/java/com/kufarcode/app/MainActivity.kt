package com.kufarcode.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import com.kufarcode.app.core.ui.KufarTheme
import com.kufarcode.app.presentation.MainViewModel
import com.kufarcode.app.presentation.navigation.AppNavGraph
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val mainViewModel: MainViewModel = hiltViewModel()
            val selectedCity by mainViewModel.selectedCity.collectAsState()
            KufarTheme(primaryColor = null) {
                Surface {
                    AppNavGraph(selectedCityCode = selectedCity)
                }
            }
        }
    }
}
