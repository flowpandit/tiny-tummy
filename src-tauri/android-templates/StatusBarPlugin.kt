package com.nikhilmehral.tinytummy

import android.app.Activity
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import androidx.core.view.WindowInsetsControllerCompat

@InvokeArg
class SetStyleArgs {
    var isLight: Boolean = true
}

@TauriPlugin
class StatusBarPlugin(private val activity: Activity) : Plugin(activity) {
    private val TAG = "StatusBarPlugin"

    @Command
    fun setStyle(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SetStyleArgs::class.java)
            val isLight = args.isLight
            Log.d(TAG, "setStyle called with isLight=$isLight")

            activity.runOnUiThread {
                val window = activity.window
                val controller = WindowInsetsControllerCompat(window, window.decorView)
                controller.isAppearanceLightStatusBars = isLight
                controller.isAppearanceLightNavigationBars = isLight
                Log.d(TAG, "Status bar style applied")
            }
            invoke.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "Error in setStyle", e)
            invoke.reject(e.message)
        }
    }
}
