package com.kufarcode.mobile

import android.app.Application
import com.kufarcode.mobile.data.local.PreferenceStorage

class KufarCodeApp : Application() {
    override fun onCreate() {
        super.onCreate()
        PreferenceStorage.initialize(this)
    }
}
