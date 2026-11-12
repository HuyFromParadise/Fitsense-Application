package com.fitsensemobile.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.fitsensemobile.database.dao.LocalActivityDao
import com.fitsensemobile.database.dao.LocalExerciseDao
import com.fitsensemobile.database.dao.LocalGpsPointDao
import com.fitsensemobile.database.dao.SensorSampleDao
import com.fitsensemobile.database.dao.StepSnapshotDao
import com.fitsensemobile.database.dao.SyncQueueDao
import com.fitsensemobile.database.entity.LocalActivityEntity
import com.fitsensemobile.database.entity.LocalExerciseEntity
import com.fitsensemobile.database.entity.LocalGpsPointEntity
import com.fitsensemobile.database.entity.SensorSampleEntity
import com.fitsensemobile.database.entity.StepSnapshotEntity
import com.fitsensemobile.database.entity.SyncQueueEntity

/** Đủ 6 bảng từ ngày 1. Đổi cột: tăng version + migration, báo người kia. */
@Database(
    entities = [
        LocalActivityEntity::class,
        LocalExerciseEntity::class,
        LocalGpsPointEntity::class,
        SyncQueueEntity::class,
        StepSnapshotEntity::class,
        SensorSampleEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class FitSenseDatabase : RoomDatabase() {

    abstract fun localActivityDao(): LocalActivityDao
    abstract fun localExerciseDao(): LocalExerciseDao
    abstract fun localGpsPointDao(): LocalGpsPointDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun stepSnapshotDao(): StepSnapshotDao
    abstract fun sensorSampleDao(): SensorSampleDao

    companion object {
        private const val DB_NAME = "fitsense.db"

        @Volatile
        private var instance: FitSenseDatabase? = null

        fun getInstance(context: Context): FitSenseDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    FitSenseDatabase::class.java,
                    DB_NAME,
                ).build().also { instance = it }
            }
    }
}
