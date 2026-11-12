package com.fitsensemobile

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.fitsensemobile.database.LocalDbModule
import com.fitsensemobile.location.ExerciseModule
import com.fitsensemobile.notification.NotificationModule
import com.fitsensemobile.sensors.MotionSensorModule
import com.fitsensemobile.steps.StepCounterModule
import com.fitsensemobile.sync.SyncModule

/** Đăng ký TẤT CẢ module ngay ngày 1; feature chỉ việc đổ logic vào module của mình. */
class FitSensePackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(
        StepCounterModule(reactContext),
        MotionSensorModule(reactContext),
        ExerciseModule(reactContext),
        LocalDbModule(reactContext),
        NotificationModule(reactContext),
        SyncModule(reactContext),
    )

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
