use serde::Deserialize;
use serde_json::Value as JsonValue;
use sqlx::{query::Query, sqlite::SqliteArguments, Sqlite};
use tauri::{Manager, Runtime};

const APP_DB_KEY: &str = "sqlite:tinytummy.db";

#[derive(Debug, Deserialize)]
pub struct SqlTransactionStatement {
    query: String,
    #[serde(default)]
    values: Vec<JsonValue>,
}

fn bind_json_value<'q>(
    query: Query<'q, Sqlite, SqliteArguments<'q>>,
    value: JsonValue,
) -> Query<'q, Sqlite, SqliteArguments<'q>> {
    if value.is_null() {
        query.bind(Option::<String>::None)
    } else if let Some(text) = value.as_str() {
        query.bind(text.to_owned())
    } else if let Some(integer) = value.as_i64() {
        query.bind(integer)
    } else if let Some(unsigned) = value.as_u64() {
        query.bind(unsigned as i64)
    } else if let Some(float) = value.as_f64() {
        query.bind(float)
    } else if let Some(boolean) = value.as_bool() {
        query.bind(boolean)
    } else {
        query.bind(value.to_string())
    }
}

#[tauri::command]
pub async fn execute_sqlite_transaction<R: Runtime>(
    app: tauri::AppHandle<R>,
    statements: Vec<SqlTransactionStatement>,
) -> Result<(), String> {
    let instances = app.state::<tauri_plugin_sql::DbInstances>();
    let pool = {
        let lock = instances.0.read().await;
        match lock.get(APP_DB_KEY) {
            Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => pool.clone(),
            None => return Err("Tiny Tummy database is not loaded.".to_string()),
        }
    };

    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| format!("Could not start SQLite transaction: {error}"))?;

    for statement in statements {
        let mut query = sqlx::query(&statement.query);
        for value in statement.values {
            query = bind_json_value(query, value);
        }

        query
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("SQLite transaction statement failed: {error}"))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("Could not commit SQLite transaction: {error}"))
}
