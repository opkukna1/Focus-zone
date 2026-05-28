package com.focuskavach.domain

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object FocusManager {
    private val _isSessionActive = MutableStateFlow(false)
    val isSessionActive: StateFlow<Boolean> = _isSessionActive.asStateFlow()

    private val _isMonkMode = MutableStateFlow(false)
    val isMonkMode: StateFlow<Boolean> = _isMonkMode.asStateFlow()

    private val _unlocksRemaining = MutableStateFlow(3)
    val unlocksRemaining: StateFlow<Int> = _unlocksRemaining.asStateFlow()

    private val _isTemporarilyUnlocked = MutableStateFlow(false)
    val isTemporarilyUnlocked: StateFlow<Boolean> = _isTemporarilyUnlocked.asStateFlow()

    // Replace with dynamic list from Room DB later
    val blockedPackages = setOf(
        "com.google.android.youtube",
        "com.instagram.android",
        "org.telegram.messenger",
        "com.facebook.katana"
    )

    fun startSession(monkMode: Boolean = false) {
        _isMonkMode.value = monkMode
        _unlocksRemaining.value = if (monkMode) 0 else 3
        _isSessionActive.value = true
        _isTemporarilyUnlocked.value = false
    }

    fun endSession() {
        _isSessionActive.value = false
    }

    fun useUnlockToken(): Boolean {
        if (_isMonkMode.value || _unlocksRemaining.value <= 0) return false
        _unlocksRemaining.value -= 1
        _isTemporarilyUnlocked.value = true
        // Note: Implement a coroutine timer to flip this back to false after 60s
        return true
    }

    fun shouldBlockApp(packageName: String): Boolean {
        return _isSessionActive.value && 
               !_isTemporarilyUnlocked.value && 
               blockedPackages.contains(packageName)
    }
}
