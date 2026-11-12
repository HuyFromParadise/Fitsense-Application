package com.fitsensemobile.common

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/** Gửi event sang JS theo tên trong `native-interface.d.ts` (NativeEventMap). */
object EventEmitterHelper {

    fun emit(
        context: ReactApplicationContext,
        eventName: String,
        payload: WritableMap = Arguments.createMap(),
    ) {
        if (context.hasActiveReactInstance()) {
            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, payload)
        }
    }
}
