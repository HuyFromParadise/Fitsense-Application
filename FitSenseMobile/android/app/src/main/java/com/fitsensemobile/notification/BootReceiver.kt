package com.fitsensemobile.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Khung: F9 (B) sẽ đăng ký lại nhắc nhở sau khi thiết bị khởi động. */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // No-op ngày 1.
        }
    }
}
