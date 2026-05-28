package com.focuskavach.utils

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import com.focuskavach.data.AppInfo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object AppFetcher {
    suspend fun getInstalledApps(context: Context, currentlyBlocked: Set<String>): List<AppInfo> {
        return withContext(Dispatchers.IO) {
            val pm = context.packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            
            val resolveInfoList = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
            
            resolveInfoList.mapNotNull { resolveInfo ->
                val packageName = resolveInfo.activityInfo.packageName
                // Skip our own app
                if (packageName == context.packageName) return@mapNotNull null
                
                val appName = resolveInfo.loadLabel(pm).toString()
                val icon = resolveInfo.loadIcon(pm)
                
                AppInfo(
                    packageName = packageName,
                    appName = appName,
                    icon = icon,
                    isSelected = currentlyBlocked.contains(packageName)
                )
            }.sortedBy { it.appName.lowercase() }
        }
    }
}
