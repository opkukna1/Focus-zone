package com.focuskavach.utils

import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import com.focuskavach.service.AppBlockerService

object PermissionsHelper {
    
    fun isAccessibilityServiceEnabled(context: Context): Boolean {
        var accessibilityEnabled = 0
        val service = AppBlockerService::class.java
        val serviceName = context.packageName + "/" + service.canonicalName
        
        try {
            accessibilityEnabled = Settings.Secure.getInt(
                context.applicationContext.contentResolver,
                Settings.Secure.ACCESSIBILITY_ENABLED
            )
        } catch (e: Settings.SettingNotFoundException) {
            // Ignore
        }
        
        if (accessibilityEnabled == 1) {
            val settingValue = Settings.Secure.getString(
                context.applicationContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            if (settingValue != null) {
                val colonSplitter = TextUtils.SimpleStringSplitter(':')
                colonSplitter.setString(settingValue)
                while (colonSplitter.hasNext()) {
                    val accessibilityService = colonSplitter.next()
                    if (accessibilityService.equals(serviceName, ignoreCase = true)) {
                        return true
                    }
                }
            }
        }
        return false
    }

    fun isOverlayPermissionGranted(context: Context): Boolean {
        return Settings.canDrawOverlays(context)
    }
}
