package com.fitsensemobile.location

import android.app.Service
import android.content.Intent
import android.os.IBinder

/** Khung foreground service ghi GPS. F2 (A) sẽ cài logic thật. */
class LocationForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY
}
