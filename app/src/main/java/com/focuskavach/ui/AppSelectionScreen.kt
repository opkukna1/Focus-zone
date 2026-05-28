package com.focuskavach.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.drawable.toBitmap
import com.focuskavach.data.AppInfo
import com.focuskavach.domain.FocusManager
import com.focuskavach.utils.AppFetcher

@Composable
fun AppSelectionScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    var appList by remember { mutableStateOf<List<AppInfo>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        appList = AppFetcher.getInstalledApps(context, FocusManager.blockedPackages.value)
        isLoading = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = {
                    // Save selected packages to FocusManager
                    val selected = appList.filter { it.isSelected }.map { it.packageName }.toSet()
                    FocusManager.updateBlockedApps(selected)
                    onBack()
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)
            ) {
                Text("Save & Back", color = Color.White)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Text(
                text = "Select Apps to Block",
                color = Color(0xFF39FF14), // Neon Green
                fontSize = 20.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF39FF14))
            }
        } else {
            LazyColumn {
                items(appList) { app ->
                    AppListItem(app = app) { isChecked ->
                        appList = appList.map { 
                            if (it.packageName == app.packageName) it.copy(isSelected = isChecked) else it 
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AppListItem(app: AppInfo, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            bitmap = app.icon.toBitmap().asImageBitmap(),
            contentDescription = app.appName,
            modifier = Modifier.size(48.dp)
        )
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Text(
            text = app.appName,
            color = Color.White,
            modifier = Modifier.weight(1f),
            fontSize = 16.sp
        )
        
        Checkbox(
            checked = app.isSelected,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(
                checkedColor = Color(0xFF39FF14),
                uncheckedColor = Color.Gray,
                checkmarkColor = Color.Black
            )
        )
    }
}
