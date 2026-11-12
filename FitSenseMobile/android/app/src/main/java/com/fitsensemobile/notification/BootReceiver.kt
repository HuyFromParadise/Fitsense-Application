package com.fitsensemobile.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.fitsensemobile.steps.StepSnapshotWorker

/** Sau reboot: chốt dữ liệu bước chân còn lại và đăng ký lại worker định kỳ. */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            StepSnapshotWorker.enqueueNow(context)
            StepSnapshotWorker.enqueuePeriodic(context)
        }
    }
}
