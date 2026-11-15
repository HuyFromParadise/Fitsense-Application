package com.fitsensemobile.location

import com.fitsensemobile.sync.SyncHandler

/**
 * Sync handler for F2 GPS Exercise, adhering to the SyncHandler interface defined by Dev B.
 */
class ExerciseSyncHandler(private val dbHelper: ExerciseLocalDbHelper) : SyncHandler {

    override val entityType: String = "EXERCISE"

    override fun collectPending(limit: Int): List<Map<String, Any?>> {
        val pendingSessions: List<LocalExerciseRecord> = dbHelper.getPendingSyncSessions(limit)
        return pendingSessions.map { session: LocalExerciseRecord ->
            val points: List<LocalGpsPointRecord> = dbHelper.getSessionPoints(session.id)
            mapOf<String, Any?>(
                "id" to session.id,
                "type" to session.type,
                "status" to session.status,
                "startedAtMs" to session.startedAtMs,
                "endedAtMs" to session.endedAtMs,
                "pausedTotalMs" to session.pausedTotalMs,
                "distanceM" to session.distanceM,
                "durationSeconds" to session.durationSeconds,
                "calories" to session.calories,
                "points" to points.map { pt: LocalGpsPointRecord ->
                    mapOf<String, Any?>(
                        "seq" to pt.seq,
                        "latitude" to pt.latitude,
                        "longitude" to pt.longitude,
                        "altitudeM" to pt.altitudeM,
                        "speedMps" to pt.speedMps,
                        "accuracyM" to pt.accuracyM,
                        "recordedAtMs" to pt.recordedAtMs
                    )
                }
            )
        }
    }
}
