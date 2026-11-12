package com.fitsensemobile.steps

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Chốt snapshot ~15 phút/lần để không mất bước khi app bị kill hoặc máy reboot. */
class StepSnapshotWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val counter = StepCounterReader.readCounter(applicationContext) ?: return Result.success()
        val store = StepStore(applicationContext)
        store.persist(store.compute(counter))
        return Result.success()
    }

    companion object {
        private const val PERIODIC_WORK = "fitsense_step_snapshot_periodic"
        private const val BOOT_WORK = "fitsense_step_snapshot_boot"

        fun enqueuePeriodic(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK,
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<StepSnapshotWorker>(15, TimeUnit.MINUTES).build(),
            )
        }

        fun enqueueNow(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork(
                BOOT_WORK,
                ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<StepSnapshotWorker>().build(),
            )
        }
    }
}
