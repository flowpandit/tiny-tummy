use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "android")]
use serde::Serialize;

#[cfg(target_os = "android")]
use tauri::Manager;

#[cfg(target_os = "android")]
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SavePdfPayload {
    file_name: String,
    base64_data: String,
}

#[cfg(target_os = "android")]
use tauri::plugin::PluginHandle;

#[cfg(target_os = "android")]
pub struct DownloadsHandle<R: Runtime>(pub PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R, ()>::new("downloads")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle =
                    api.register_android_plugin("com.nikhilmehral.tinytummy", "DownloadsPlugin")?;
                app.manage(DownloadsHandle(handle));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

#[tauri::command]
pub async fn save_pdf_to_downloads<R: Runtime>(
    app: tauri::AppHandle<R>,
    file_name: String,
    base64_data: String,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let handle = app.state::<DownloadsHandle<R>>();
        return handle
            .0
            .run_mobile_plugin::<()>(
                "savePdfToDownloads",
                SavePdfPayload {
                    file_name,
                    base64_data,
                },
            )
            .map_err(|e: tauri::plugin::mobile::PluginInvokeError| e.to_string());
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, file_name, base64_data);
        Err("Saving directly to Downloads is only supported on Android.".to_string())
    }
}
