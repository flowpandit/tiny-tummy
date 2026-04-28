use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(any(target_os = "android", target_os = "ios"))]
use tauri::Manager;

#[cfg(any(target_os = "android", target_os = "ios"))]
use tauri::plugin::PluginHandle;

#[cfg(any(target_os = "android", target_os = "ios"))]
pub struct BillingHandle<R: Runtime>(pub PluginHandle<R>);

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_billing);

#[cfg(any(target_os = "android", target_os = "ios"))]
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BillingProductPayload {
    product_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BillingPluginResponse {
    pub ok: bool,
    pub restored: bool,
    pub product_id: Option<String>,
    pub message: Option<String>,
}

fn unsupported_response(message: &str) -> BillingPluginResponse {
    BillingPluginResponse {
        ok: false,
        restored: false,
        product_id: None,
        message: Some(message.to_string()),
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R, ()>::new("billing")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let handle =
                    api.register_android_plugin("com.nikhilmehral.tinytummy", "BillingPlugin")?;
                app.manage(BillingHandle(handle));
            }
            #[cfg(target_os = "ios")]
            {
                let handle = api.register_ios_plugin(init_plugin_billing)?;
                app.manage(BillingHandle(handle));
            }
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

#[tauri::command]
pub async fn billing_purchase_premium<R: Runtime>(
    app: tauri::AppHandle<R>,
    product_id: String,
) -> Result<BillingPluginResponse, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let handle = app.state::<BillingHandle<R>>();
        return handle
            .0
            .run_mobile_plugin::<BillingPluginResponse>(
                "purchasePremium",
                BillingProductPayload { product_id },
            )
            .map_err(|e: tauri::plugin::mobile::PluginInvokeError| e.to_string());
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = (app, product_id);
        Ok(unsupported_response("Mobile billing is only available on iOS and Android store builds."))
    }
}

#[tauri::command]
pub async fn billing_restore_premium<R: Runtime>(
    app: tauri::AppHandle<R>,
    product_id: String,
) -> Result<BillingPluginResponse, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let handle = app.state::<BillingHandle<R>>();
        return handle
            .0
            .run_mobile_plugin::<BillingPluginResponse>(
                "restorePremium",
                BillingProductPayload { product_id },
            )
            .map_err(|e: tauri::plugin::mobile::PluginInvokeError| e.to_string());
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = (app, product_id);
        Ok(unsupported_response("Mobile restore is only available on iOS and Android store builds."))
    }
}

#[tauri::command]
pub async fn billing_check_owned_premium<R: Runtime>(
    app: tauri::AppHandle<R>,
    product_id: String,
) -> Result<BillingPluginResponse, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let handle = app.state::<BillingHandle<R>>();
        return handle
            .0
            .run_mobile_plugin::<BillingPluginResponse>(
                "checkOwnedPremium",
                BillingProductPayload { product_id },
            )
            .map_err(|e: tauri::plugin::mobile::PluginInvokeError| e.to_string());
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let _ = (app, product_id);
        Ok(unsupported_response("Mobile ownership sync is only available on iOS and Android store builds."))
    }
}
