package com.focuskavach.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.focuskavach.data.SessionDao
import com.focuskavach.data.SessionEntity
import com.focuskavach.domain.FocusManager
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.Calendar

class MainViewModel(private val dao: SessionDao) : ViewModel() {

    val isSessionActive = FocusManager.isSessionActive

    private val startOfDay: Long
        get() {
            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            return cal.timeInMillis
        }

    val todayFocusMinutes = dao.getTodayFocusMinutes(startOfDay)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun startSession(monkMode: Boolean) {
        FocusManager.startSession(monkMode)
    }

    fun endSession(durationMinutes: Int, isMonkMode: Boolean) {
        FocusManager.endSession()
        
        // Save to Room DB
        viewModelScope.launch {
            dao.insertSession(
                SessionEntity(
                    durationMinutes = durationMinutes,
                    isMonkMode = isMonkMode,
                    unlocksUsed = 3 - FocusManager.unlocksRemaining.value
                )
            )
        }
    }
}

class MainViewModelFactory(private val dao: SessionDao) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return MainViewModel(dao) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
