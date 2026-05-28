package com.focuskavach.domain

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

object FocusManager {
    private val _isSessionActive = MutableStateFlow(false)
    val isSessionActive: StateFlow<Boolean> = _isSessionActive.asStateFlow()

    private val _isMonkMode = MutableStateFlow(false)
    val isMonkMode: StateFlow<Boolean> = _isMonkMode.asStateFlow()

    private val _unlocksRemaining = MutableStateFlow(3)
    val unlocksRemaining: StateFlow<Int> = _unlocksRemaining.asStateFlow()

    private val _isTemporarilyUnlocked = MutableStateFlow(false)
    val isTemporarilyUnlocked: StateFlow<Boolean> = _isTemporarilyUnlocked.asStateFlow()

    private val _blockedPackages = MutableStateFlow<Set<String>>(emptySet())
    val blockedPackages: StateFlow<Set<String>> = _blockedPackages.asStateFlow()

    private val timerScope = CoroutineScope(Dispatchers.Default)

    fun updateBlockedApps(packages: Set<String>) {
        _blockedPackages.value = packages
    }

    fun startSession(monkMode: Boolean = false) {
        _isMonkMode.value = monkMode
        _unlocksRemaining.value = if (monkMode) 0 else 3
        _isSessionActive.value = true
        _isTemporarilyUnlocked.value = false
    }

    fun endSession() {
        _isSessionActive.value = false
        _isTemporarilyUnlocked.value = false
    }

    fun useUnlockToken(): Boolean {
        if (_isMonkMode.value || _unlocksRemaining.value <= 0) return false
        
        _unlocksRemaining.value -= 1
        _isTemporarilyUnlocked.value = true
        
        // Start 1-minute countdown to re-lock
        timerScope.launch {
            delay(60_000L) // 1 minute in milliseconds
            _isTemporarilyUnlocked.value = false
        }
        return true
    }

    fun shouldBlockApp(packageName: String): Boolean {
        return _isSessionActive.value && 
               !_isTemporarilyUnlocked.value && 
               _blockedPackages.value.contains(packageName)
    }
}
