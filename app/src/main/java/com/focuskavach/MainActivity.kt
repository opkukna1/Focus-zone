package com.focuskavach

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuskavach.data.AppDatabase
import com.focuskavach.service.FocusForegroundService
import com.focuskavach.ui.AppSelectionScreen
import com.focuskavach.ui.MainViewModel
import com.focuskavach.ui.MainViewModelFactory
import com.focuskavach.utils.PermissionsHelper

// Simple Navigation State
enum class Screen { HOME, APP_SELECTION }

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels {
        MainViewModelFactory(AppDatabase.getDatabase(this).sessionDao())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            FocusKavachTheme {
                var currentScreen by remember { mutableStateOf(Screen.HOME) }

                when (currentScreen) {
                    Screen.HOME -> HomeScreen(
                        viewModel = viewModel,
                        onStartService = ::startFocusService,
                        onStopService = ::stopFocusService,
                        onNavigateToAppSelection = { currentScreen = Screen.APP_SELECTION }
                    )
                    Screen.APP_SELECTION -> AppSelectionScreen(
                        onBack = { currentScreen = Screen.HOME }
                    )
                }
            }
        }
    }

    private fun startFocusService() {
        val intent = Intent(this, FocusForegroundService::class.java)
        startForegroundService(intent)
    }

    private fun stopFocusService() {
        val intent = Intent(this, FocusForegroundService::class.java).apply {
            action = "STOP_SERVICE"
        }
        startService(intent)
    }
}

@Composable
fun FocusKavachTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            background = Color.Black,
            surface = Color(0xFF121212),
            primary = Color(0xFF39FF14), 
            onPrimary = Color.Black,
            onBackground = Color.White
        ),
        content = content
    )
}

@Composable
fun HomeScreen(
    viewModel: MainViewModel,
    onStartService: () -> Unit,
    onStopService: () -> Unit,
    onNavigateToAppSelection: () -> Unit
) {
    val context = LocalContext.current
    val isSessionActive by viewModel.isSessionActive.collectAsState()
    val todayMinutes by viewModel.todayFocusMinutes.collectAsState()
    
    var monkModeEnabled by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(40.dp))

        Text(
            text = "FocusKavach",
            color = MaterialTheme.colorScheme.primary,
            fontSize = 32.sp,
            fontWeight = FontWeight.ExtraBold
        )
        Text(
            text = "Protect Your Attention",
            color = Color.Gray,
            fontSize = 14.sp
        )

        Spacer(modifier = Modifier.height(40.dp))

        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("Today's Focus", color = Color.LightGray)
                Text(
                    text = "${todayMinutes ?: 0} Min",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        if (!isSessionActive) {
            Button(
                onClick = onNavigateToAppSelection,
                colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Select Apps to Block", color = Color.White)
            }

            Spacer(modifier = Modifier.height(20.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text("Monk Mode (No Unlocks)", color = Color.White)
                Spacer(modifier = Modifier.width(16.dp))
                Switch(
                    checked = monkModeEnabled,
                    onCheckedChange = { monkModeEnabled = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = MaterialTheme.colorScheme.primary)
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = {
                if (isSessionActive) {
                    viewModel.endSession(durationMinutes = 25, isMonkMode = monkModeEnabled)
                    onStopService()
                } else {
                    // 1. Check Battery Optimization
                    if (!PermissionsHelper.isBatteryOptimizationIgnored(context)) {
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:${context.packageName}")
                        }
                        context.startActivity(intent)
                        return@Button
                    }
                    // 2. Check Overlay
                    if (!PermissionsHelper.isOverlayPermissionGranted(context)) {
                        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
                        context.startActivity(intent)
                        return@Button
                    }
                    // 3. Check Accessibility
                    if (!PermissionsHelper.isAccessibilityServiceEnabled(context)) {
                        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                        context.startActivity(intent)
                        return@Button
                    }
                    
                    viewModel.startSession(monkModeEnabled)
                    onStartService()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isSessionActive) Color.Red else MaterialTheme.colorScheme.primary,
                contentColor = if (isSessionActive) Color.White else Color.Black
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(
                text = if (isSessionActive) "END SESSION" else "START FOCUS",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(30.dp))
    }
}
