package com.nikhilmehral.tinytummy

import android.app.Activity
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
    @Command
    fun setStyle(invoke: Invoke) {
        val args = invoke.parseArgs(SetStyleArgs::class.java)
        activity.runOnUiThread {
            val window = activity.window
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.isAppearanceLightStatusBars = args.isLight
            controller.isAppearanceLightNavigationBars = args.isLight
        }
        invoke.resolve()
    }
}
