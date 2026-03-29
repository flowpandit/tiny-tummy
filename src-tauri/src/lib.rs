mod engine;
mod statusbar;

use tauri_plugin_sql::{Migration, MigrationKind};

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
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add rich feeding fields",
            sql: include_str!("../migrations/002_rich_feeding.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add episode mode",
            sql: include_str!("../migrations/003_episode_mode.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
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
        .plugin(statusbar::init())
        .invoke_handler(tauri::generate_handler![
            check_frequency_alert,
            check_color_alert,
            get_child_status,
            get_guidance_tips,
            statusbar::set_status_bar_style,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
