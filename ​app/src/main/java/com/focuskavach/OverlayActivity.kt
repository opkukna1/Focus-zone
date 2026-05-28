package com.focuskavach

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.focuskavach.domain.FocusManager

class OverlayActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setContent {
            val unlocks by FocusManager.unlocksRemaining.collectAsState()
            val isMonkMode by FocusManager.isMonkMode.collectAsState()

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black), // Deep Black UI
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "FOCUS MODE ACTIVE",
                        color = Color(0xFF39FF14), // Neon Green
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        text = "Protect Your Attention.",
                        color = Color.LightGray,
                        fontSize = 16.sp
                    )
                    
                    Spacer(modifier = Modifier.height(48.dp))

                    if (!isMonkMode && unlocks > 0) {
                        Button(
                            onClick = { 
                                FocusManager.useUnlockToken()
                                finish() // Close overlay temporarily
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)
                        ) {
                            Text("1 Min Unlock ($unlocks left)", color = Color.White)
                        }
                    } else if (isMonkMode) {
                        Text(
                            text = "MONK MODE",
                            color = Color.Red,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
    
    // Prevent back button from bypassing the screen
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Do nothing. Force them to use home button.
    }
}
