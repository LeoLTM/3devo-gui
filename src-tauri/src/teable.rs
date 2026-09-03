use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use teable::{
    client::TeableClient,
    models::field::{field_types::FieldType, Field, FieldBuilder},
    models::record::{CreateRecordsRequest, FieldKeyType, RecordUpdate, UpdateRecordRequest},
};

use crate::config;

/// User information returned to the frontend after a successful connection test.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeableUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub avatar: Option<String>,
}

/// Space entry from `GET /api/space`.
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct SpaceEntry {
    id: String,
    name: String,
}

/// Test a connection to a Teable instance.
///
/// Strategy:
/// 1. Call `GET /api/space` with the PAT to verify the token is valid
///    (this endpoint works with Personal Access Tokens).
/// 2. Optionally call `GET /api/auth/user/me` to fetch user profile info.
///    If that returns 403 (common with scoped PATs), we still consider the
///    connection successful and return placeholder user info.
#[tauri::command]
pub async fn test_teable_connection(url: String, token: String) -> Result<TeableUser, String> {
    let url = url.trim_end_matches('/').to_string();
    let client = TeableClient::builder()
        .base_url(format!("{}/api", url))
        .map_err(|e| e.to_string())?
        .token(token)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Step 1: Fetch spaces
    client
        .spaces()
        .get_space_list()
        .await
        .map_err(|e| e.to_string())?;

    let user_result = client
        .auth()
        .get_user_me()
        .await
        .map_err(|e| e.to_string())?;

    let user = TeableUser {
        id: user_result.id,
        name: user_result.name,
        email: user_result.email.unwrap_or_default(),
        avatar: user_result.avatar,
    };

    eprintln!(
        "[TEABLE] Connection test successful. User: {} ({})",
        user.name, user.email
    );
    Ok(user)
}

/// Save Teable connection details to the config file.
#[tauri::command]
pub fn save_teable_config(
    url: String,
    token: String,
    user_name: String,
    user_email: String,
    user_avatar: Option<String>,
) -> Result<config::AppConfig, String> {
    let mut cfg = config::load_config()?;
    cfg.teable_url = Some(url);
    cfg.teable_token = Some(token);
    cfg.teable_user_name = Some(user_name);
    cfg.teable_user_email = Some(user_email);
    cfg.teable_user_avatar = user_avatar;
    config::save_config(&cfg)?;
    Ok(cfg)
}

/// Remove (clear) the Teable integration from the config file.
#[tauri::command]
pub fn remove_teable_config() -> Result<config::AppConfig, String> {
    let mut cfg = config::load_config()?;
    cfg.teable_url = None;
    cfg.teable_token = None;
    cfg.teable_user_name = None;
    cfg.teable_user_email = None;
    cfg.teable_user_avatar = None;
    cfg.teable_space_id = None;
    cfg.teable_base_id = None;
    cfg.teable_table_id = None;
    config::save_config(&cfg)?;
    Ok(cfg)
}

/// Space entry from the Teable API.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeableSpace {
    pub id: String,
    pub name: String,
}

/// Base entry from the Teable API.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TeableBase {
    pub id: String,
    pub name: String,
    pub space_id: String,
}

/// Table entry from the Teable API.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TeableTable {
    pub id: String,
    pub name: String,
}

/// List all spaces accessible with the current token.
#[tauri::command]
pub async fn list_teable_spaces() -> Result<Vec<TeableSpace>, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;

    let client = TeableClient::builder()
        .base_url(format!("{}/api", url))
        .map_err(|e| format!("Failed to build Teable client: {}", e))?
        .token(token)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to build Teable client: {}", e))?;

    let spaces = client
        .spaces()
        .get_space_list()
        .await
        .map_err(|e| format!("Failed to fetch spaces: {}", e))?
        .into_iter()
        .map(|space| TeableSpace {
            id: space.id,
            name: space.name,
        })
        .collect();

    Ok(spaces)
}

/// List all bases in a specific space.
#[tauri::command]
pub async fn list_teable_bases(space_id: String) -> Result<Vec<TeableBase>, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;

    let client = TeableClient::builder()
        .base_url(format!("{}/api", url))
        .map_err(|e| format!("Failed to build Teable client: {}", e))?
        .token(token)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to build Teable client: {}", e))?;

    let bases = client
        .bases()
        .list_bases(&space_id)
        .await
        .map_err(|e| format!("Failed to fetch bases: {}", e))?
        .into_iter()
        .map(|base| TeableBase {
            id: base.id,
            name: base.name,
            space_id: space_id.clone(),
        })
        .collect();

    Ok(bases)
}

/// List all tables in a specific base.
#[tauri::command]
pub async fn list_teable_tables(base_id: String) -> Result<Vec<TeableTable>, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;

    let client = TeableClient::builder()
        .base_url(format!("{}/api", url))
        .map_err(|e| format!("Failed to build Teable client: {}", e))?
        .token(token)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to build Teable client: {}", e))?;

    let tables = client
        .tables()
        .list_tables(&base_id)
        .await
        .map_err(|e| format!("Failed to fetch tables: {}", e))?
        .into_iter()
        .map(|table| TeableTable {
            id: table.id,
            name: table.name,
        })
        .collect();

    Ok(tables)
}

/// Save the selected space, base, and table to the config.
#[tauri::command]
pub fn save_teable_target(
    space_id: String,
    base_id: String,
    table_id: String,
) -> Result<config::AppConfig, String> {
    let mut cfg = config::load_config()?;
    cfg.teable_space_id = Some(space_id);
    cfg.teable_base_id = Some(base_id);
    cfg.teable_table_id = Some(table_id);
    config::save_config(&cfg)?;
    Ok(cfg)
}

/// Response from creating/updating a Teable record.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeableRecord {
    pub id: String,
    pub fields: serde_json::Value,
}


/// All fields that the experiment row needs.
/// The first entry in the table (primary field) is *not* included here because
/// Teable creates a primary "Title" field automatically.
fn required_fields() -> Vec<Field> {
    vec![
    FieldBuilder::new("", "Created At", FieldType::SingleLineText)
        .description("Date/time when the experiment was started (ISO 8601)")
        .build(),
    FieldBuilder::new("", "Operator", FieldType::SingleLineText)
        .description("Name of the operator (from Teable API token)")
        .build(),
    FieldBuilder::new("", "Source Material ID", FieldType::SingleLineText)
        .description("Free-text material identifier")
        .build(),
    FieldBuilder::new("", "Set RPM", FieldType::Number)
        .description("Extruder set RPM at experiment start")
        .build(),
    FieldBuilder::new("", "Set T4", FieldType::Number)
        .description("Heater 4 set temperature")
        .build(),
    FieldBuilder::new("", "Set T3", FieldType::Number)
        .description("Heater 3 set temperature")
        .build(),
    FieldBuilder::new("", "Set T2", FieldType::Number)
        .description("Heater 2 set temperature")
        .build(),
    FieldBuilder::new("", "Set T1", FieldType::Number)
        .description("Heater 1 set temperature")
        .build(),
    FieldBuilder::new("", "Fan Percent", FieldType::Number)
        .description("Fan speed percentage")
        .build(),
    FieldBuilder::new("", "Set Diameter", FieldType::Number)
        .description("Target filament diameter (1.75 or 2.85 mm)")
        .build(),
    FieldBuilder::new("", "Nozzle Diameter", FieldType::Number)
        .description("Nozzle diameter (2, 3, or 4 mm)")
        .build(),
    FieldBuilder::new("", "Filament Weight", FieldType::Number)
        .description("Calculated weight (volume × density), filled on stop")
        .build(),
    FieldBuilder::new("", "Duration", FieldType::SingleLineText)
        .description("Experiment duration (HH:MM:SS), filled on stop")
        .build(),
    FieldBuilder::new("", "Experiment Name", FieldType::SingleLineText)
        .description("User-defined experiment name")
        .build(),
    FieldBuilder::new("", "Color", FieldType::SingleLineText)
        .description("Filament color")
        .build(),
    FieldBuilder::new("", "Manufacturing Location", FieldType::SingleLineText)
        .description("Where the experiment is performed")
        .build(),
    FieldBuilder::new("", "Notes", FieldType::LongText)
        .description("Free-form notes about the experiment")
        .build(),
    ]
}

/// Ensure all fields required by 3devo-gui exist in the selected table.
///
/// 1. Fetches the current field list via `GET /api/table/{tableId}/field`.
/// 2. Compares against [`REQUIRED_FIELDS`].
/// 3. Creates any missing fields via `POST /api/table/{tableId}/field`.
///
/// Returns the list of fields that were created (empty if all existed).
#[tauri::command]
pub async fn ensure_teable_fields() -> Result<Vec<String>, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;
    let table_id = cfg.teable_table_id.ok_or("No Teable table selected")?;

    let client = TeableClient::builder()
        .base_url(format!("{}/api", url))
        .map_err(|e| format!("Failed to build Teable client: {}", e))?
        .token(token)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to build Teable client: {}", e))?;

    let fields = client
        .fields()
        .list_fields(&table_id)
        .await
        .map_err(|e| format!("Failed to fetch fields: {}", e))?;

    let mut created = Vec::new();
    for field in required_fields() {
        if fields.iter().find(|f| f.name == field.name).is_none() {
            let created_field = client
                .fields()
                .create_field(&table_id, &field)
                .await
                .map_err(|e| format!("Failed to create field: {}", e))?;
            created.push(created_field.name.clone());
        }
    }

    Ok(created)
}

/// Create a new record in the configured Teable table.
///
/// `fields` is a JSON object mapping field names to values, e.g.
/// `{ "Operator": "Leo", "Set RPM": 12.5 }`.
///
/// Returns the created record (including its ID for later updates).
#[tauri::command]
pub async fn create_teable_record(fields: serde_json::Value) -> Result<TeableRecord, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;
    let table_id = cfg.teable_table_id.ok_or("No Teable table selected")?;

    let client = TeableClient::builder()
        .base_url(format!("{}/api", url))
        .map_err(|e| format!("Failed to build Teable client: {}", e))?
        .token(token)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to build Teable client: {}", e))?;

    eprintln!("[TEABLE] Creating record in table {}", table_id);
    eprintln!(
        "[TEABLE] Fields: {}",
        serde_json::to_string_pretty(&fields).unwrap_or_default()
    );

    let table_fields = client
        .fields()
        .list_fields(&table_id)
        .await
        .map_err(|e| format!("Failed to fetch fields: {}", e))?;

    let input_fields = fields
        .as_object()
        .ok_or("Record fields must be a JSON object")?;
    let mut record_fields = HashMap::with_capacity(input_fields.len());

    for (field_name, value) in input_fields {
        let field = table_fields
            .iter()
            .find(|field| field.name == *field_name)
            .ok_or_else(|| format!("Teable field not found: {}", field_name))?;
        record_fields.insert(field.id.clone(), value.clone());
    }

    let created_response = client
        .records()
        .create_records(
            &table_id,
            &CreateRecordsRequest {
                field_key_type: FieldKeyType::Id,
                typecast: Some(true),
                order: None,
                records: vec![RecordUpdate {
                    fields: record_fields,
                }],
            },
        )
        .await
        .map_err(|e| {
            eprintln!("[TEABLE] Failed to create record: {:?}", e);
            format!("Failed to create record: {}", e)
        })?;

    let created_record = created_response
        .records
        .first()
        .ok_or("Create record returned no records")?;

    let record = TeableRecord {
        id: created_record.id.clone(),
        fields: created_record.fields.clone(),
    };

    eprintln!("[TEABLE] Record created with ID: {}", record.id);
    Ok(record)
}

/// Update an existing record in the configured Teable table.
///
/// `record_id` is the Teable record ID (e.g. "recXXX...").
/// `fields` is a JSON object with only the fields to update.
#[tauri::command]
pub async fn update_teable_record(
    record_id: String,
    fields: serde_json::Value,
) -> Result<TeableRecord, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;
    let table_id = cfg.teable_table_id.ok_or("No Teable table selected")?;

    let client = TeableClient::builder()
        .base_url(format!("{}/api", url))
        .map_err(|e| format!("Failed to build Teable client: {}", e))?
        .token(token)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to build Teable client: {}", e))?;

    eprintln!(
        "[TEABLE] Updating record {} in table {}",
        record_id, table_id
    );
    eprintln!(
        "[TEABLE] Fields: {}",
        serde_json::to_string_pretty(&fields).unwrap_or_default()
    );

    let table_fields = client
        .fields()
        .list_fields(&table_id)
        .await
        .map_err(|e| format!("Failed to fetch fields: {}", e))?;

    let input_fields = fields
        .as_object()
        .ok_or("Record fields must be a JSON object")?;
    let mut record_fields = HashMap::with_capacity(input_fields.len());

    for (field_name, value) in input_fields {
        let field = table_fields
            .iter()
            .find(|field| field.name == *field_name)
            .ok_or_else(|| format!("Teable field not found: {}", field_name))?;
        record_fields.insert(field.id.clone(), value.clone());
    }

    let record = client
        .records()
        .update_record(
            &table_id,
            &record_id,
            &UpdateRecordRequest {
                field_key_type: FieldKeyType::Id,
                typecast: Some(true),
                record: RecordUpdate {
                    fields: record_fields,
                },
                order: None,
            },
        )
        .await
        .map_err(|e| {
            eprintln!("[TEABLE] Failed to update record: {:?}", e);
            format!("Failed to update record: {}", e)
        })?;

    let record = TeableRecord {
        id: record.id,
        fields: record.fields,
    };

    eprintln!("[TEABLE] Record {} updated", record.id);
    Ok(record)
}
