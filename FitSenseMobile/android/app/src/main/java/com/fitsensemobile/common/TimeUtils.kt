package com.fitsensemobile.common

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Thời gian: epoch milliseconds. Ngày: yyyy-MM-dd theo giờ địa phương thiết bị. */
object TimeUtils {

    fun nowMs(): Long = System.currentTimeMillis()

    fun todayIso(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(nowMs()))

    fun timeZoneId(): String = TimeZone.getDefault().id
}
