use serde::Serialize;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SetStylePayload {
    is_light: bool,
}

#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;

#[cfg(target_os = "android")]
pub struct StatusBarHandle<R: Runtime>(pub PluginHandle<R>);

/// Plugin setup — registers the Android Kotlin plugin for status bar control.
/// On desktop this is a no-op.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R, ()>::new("statusbar")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle =
                    api.register_android_plugin("com.nikhilmehral.tinytummy", "StatusBarPlugin")?;
                app.manage(StatusBarHandle(handle));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

/// Command callable from TypeScript via invoke("set_status_bar_style", { isLight: true })
#[tauri::command]
pub async fn set_status_bar_style<R: Runtime>(app: tauri::AppHandle<R>, is_light: bool) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let handle = app.state::<StatusBarHandle<R>>();
        handle
            .0
            .run_mobile_plugin::<()>("setStyle", SetStylePayload { is_light })
            .map_err(|e: tauri::plugin::mobile::PluginInvokeError| e.to_string())?;
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, is_light);
    }
    Ok(())
}
