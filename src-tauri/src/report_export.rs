use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "ios")]
use serde::Serialize;
#[cfg(target_os = "ios")]
use tauri::plugin::PluginHandle;
#[cfg(target_os = "ios")]
use tauri::Manager;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_report_export);

#[cfg(target_os = "ios")]
pub struct ReportExportHandle<R: Runtime>(pub PluginHandle<R>);

#[cfg(target_os = "ios")]
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SharePdfPayload {
    file_name: String,
    base64_data: String,
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R, ()>::new("report_export")
        .setup(|app, api| {
            #[cfg(target_os = "ios")]
            {
                let handle = api.register_ios_plugin(init_plugin_report_export)?;
                app.manage(ReportExportHandle(handle));
            }
            #[cfg(not(target_os = "ios"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

#[tauri::command]
pub async fn share_pdf_report<R: Runtime>(
    app: tauri::AppHandle<R>,
    file_name: String,
    base64_data: String,
) -> Result<(), String> {
    #[cfg(target_os = "ios")]
    {
        let handle = app.state::<ReportExportHandle<R>>();
        return handle
            .0
            .run_mobile_plugin::<()>(
                "sharePdfReport",
                SharePdfPayload {
                    file_name,
                    base64_data,
                },
            )
            .map_err(|error: tauri::plugin::mobile::PluginInvokeError| error.to_string());
    }
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (app, file_name, base64_data);
        Err("PDF sharing is only supported on iOS and iPadOS.".to_string())
    }
}
