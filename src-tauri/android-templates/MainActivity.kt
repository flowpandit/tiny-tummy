package com.nikhilmehral.tinytummy

import android.graphics.Color
import android.os.Bundle
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Manual edge-to-edge setup. We avoid enableEdgeToEdge() because it installs
    // an OnPreDrawListener that continuously overrides status bar icon appearance.
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT

    super.onCreate(savedInstanceState)

    // Set initial status bar style based on system theme.
    // After this, ThemeContext controls it via StatusBarPlugin.
    val isNight = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.isAppearanceLightStatusBars = !isNight
    controller.isAppearanceLightNavigationBars = !isNight
  }
}
