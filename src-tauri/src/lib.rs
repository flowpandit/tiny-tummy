mod billing;
mod db_transaction;
mod downloads;
mod engine;
mod report_export;
mod report_pdf;
mod statusbar;

use std::{env, fs};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const E2E_RESET_ENV_KEY: &str = "TAURI_E2E_RESET";
const APP_DB_FILENAME: &str = "tinytummy.db";

fn reset_e2e_state_if_requested(app: &tauri::App) {
    if env::var_os(E2E_RESET_ENV_KEY).is_none() {
        return;
    }

    let Ok(app_data_dir) = app.path().app_data_dir() else {
        eprintln!("TAURI_E2E_RESET was set but app_data_dir could not be resolved");
        return;
    };

    let db_path = app_data_dir.join(APP_DB_FILENAME);
    if db_path.exists() {
        if let Err(error) = fs::remove_file(&db_path) {
            eprintln!(
                "TAURI_E2E_RESET failed to remove {}: {error}",
                db_path.display()
            );
        }
    }
}

#[tauri::command]
fn check_frequency_alert(
    child_name: String,
    date_of_birth: String,
    feeding_type: String,
    last_poop_at: Option<String>,
) -> Option<(String, String, String, String)> {
    let child = crate::engine::ChildInfo {
        name: child_name,
        date_of_birth,
        feeding_type,
    };
    match last_poop_at {
        Some(ref ts) => engine::normal_range::check_frequency_alert(&child, ts),
        None => None,
    }
}

#[tauri::command]
fn check_color_alert(
    child_name: String,
    date_of_birth: String,
    feeding_type: String,
    color: String,
) -> Option<(String, String, String, String)> {
    let child = crate::engine::ChildInfo {
        name: child_name,
        date_of_birth,
        feeding_type,
    };
    engine::normal_range::check_color_alert(&child, &color)
}

#[tauri::command]
fn get_child_status(
    date_of_birth: String,
    feeding_type: String,
    last_poop_at: Option<String>,
) -> (String, String) {
    engine::normal_range::get_status_for_child(
        &date_of_birth,
        &feeding_type,
        last_poop_at.as_deref(),
    )
}

#[tauri::command]
fn get_guidance_tips() -> Vec<engine::guidance::GuidanceTip> {
    engine::guidance::get_all_tips()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create baseline local-first schema",
        sql: include_str!("../migrations/001_baseline.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .setup(|app| {
            reset_e2e_state_if_requested(app);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tinytummy.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(billing::init())
        .plugin(downloads::init())
        .plugin(report_export::init())
        .plugin(statusbar::init())
        .invoke_handler(tauri::generate_handler![
            billing::billing_purchase_premium,
            billing::billing_restore_premium,
            billing::billing_check_owned_premium,
            billing::billing_get_product_metadata,
            check_frequency_alert,
            check_color_alert,
            db_transaction::execute_sqlite_transaction,
            get_child_status,
            get_guidance_tips,
            downloads::open_file_from_downloads,
            downloads::open_pdf_from_downloads,
            downloads::save_pdf_to_downloads,
            downloads::save_text_to_downloads,
            report_pdf::generate_native_report_pdf,
            report_export::share_pdf_report,
            report_export::share_json_backup,
            statusbar::set_status_bar_style,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
