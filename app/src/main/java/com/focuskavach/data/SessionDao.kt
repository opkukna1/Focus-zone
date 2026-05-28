package com.focuskavach.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {
    @Insert
    suspend fun insertSession(session: SessionEntity)

    @Query("SELECT * FROM focus_sessions ORDER BY timestamp DESC")
    fun getAllSessions(): Flow<List<SessionEntity>>

    @Query("SELECT SUM(durationMinutes) FROM focus_sessions WHERE timestamp >= :startOfDay")
    fun getTodayFocusMinutes(startOfDay: Long): Flow<Int?>
}
