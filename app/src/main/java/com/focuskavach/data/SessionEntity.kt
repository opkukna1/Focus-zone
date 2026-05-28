package com.focuskavach.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "focus_sessions")
data class SessionEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val durationMinutes: Int,
    val isMonkMode: Boolean,
    val unlocksUsed: Int,
    val timestamp: Long = System.currentTimeMillis()
)
