package com.fitsensemobile.common

import android.content.Context
import android.content.pm.PackageManager

/** Ngày 1 chỉ kiểm tra trạng thái; luồng xin quyền thật làm ở F5/F6. */
object PermissionHelper {

    fun isGranted(context: Context, permission: String): Boolean =
        context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

    fun statusName(granted: Boolean): String = if (granted) "GRANTED" else "DENIED"
}
