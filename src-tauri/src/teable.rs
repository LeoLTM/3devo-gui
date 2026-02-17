use serde::{Deserialize, Serialize};
use std::error::Error;

use crate::config;

/// User information returned to the frontend after a successful connection test.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeableUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub avatar: Option<String>,
}

/// Partial user info from `GET /api/auth/user/me` (has many optional fields).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthUserMe {
    id: Option<String>,
    name: Option<String>,
    email: Option<String>,
    avatar: Option<String>,
}

/// Space entry from `GET /api/space`.
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct SpaceEntry {
    id: String,
    name: String,
}

/// Build a reqwest client configured for Teable API calls.
fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        // Accept self-signed / incompletely-chained certificates.
        // The user explicitly provides the URL of their own self-hosted
        // Teable instance, so strict CA verification is not required.
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| {
            eprintln!("[TEABLE] Failed to build HTTP client: {:?}", e);
            format!("Failed to create HTTP client: {}", e)
        })
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
    let client = build_client()?;

    // --- Step 1: Verify the token by listing spaces ---
    let spaces_endpoint = format!("{}/api/space", url);
    eprintln!("[TEABLE] Step 1: Testing token via GET {}", spaces_endpoint);

    let spaces_response = client
        .get(&spaces_endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| {
            eprintln!("[TEABLE] Request to /api/space failed: {:?}", e);
            if let Some(source) = e.source() {
                eprintln!("[TEABLE]   source: {:?}", source);
            }
            if e.is_connect() {
                format!(
                    "Could not connect to {} — check the URL and your network connection. Details: {}",
                    url, e
                )
            } else if e.is_timeout() {
                format!("Connection to {} timed out", url)
            } else {
                format!("Failed to connect to Teable instance: {}", e)
            }
        })?;

    let spaces_status = spaces_response.status();
    eprintln!("[TEABLE] /api/space response status: {}", spaces_status);

    if spaces_status == reqwest::StatusCode::UNAUTHORIZED {
        return Err("Invalid or expired access token. Please check your Personal Access Token.".into());
    }

    if !spaces_status.is_success() {
        let body = spaces_response
            .text()
            .await
            .unwrap_or_else(|_| "No response body".to_string());
        eprintln!("[TEABLE] /api/space error body: {}", body);
        return Err(format!("Teable API returned {} — {}", spaces_status, body));
    }

    let spaces_body = spaces_response
        .text()
        .await
        .unwrap_or_default();
    eprintln!("[TEABLE] /api/space body: {}", spaces_body);

    // Token is valid! Now try to get user info.

    // --- Step 2: Try to fetch user profile ---
    let user_endpoint = format!("{}/api/auth/user/me", url);
    eprintln!("[TEABLE] Step 2: Fetching user profile via GET {}", user_endpoint);

    let user_result = client
        .get(&user_endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await;

    let user = match user_result {
        Ok(resp) if resp.status().is_success() => {
            let body = resp.text().await.unwrap_or_default();
            eprintln!("[TEABLE] /api/auth/user/me body: {}", body);
            match serde_json::from_str::<AuthUserMe>(&body) {
                Ok(auth_user) => TeableUser {
                    id: auth_user.id.unwrap_or_default(),
                    name: auth_user.name.unwrap_or_else(|| "Teable User".into()),
                    email: auth_user.email.unwrap_or_default(),
                    avatar: auth_user.avatar,
                },
                Err(e) => {
                    eprintln!("[TEABLE] Could not parse user/me response: {}", e);
                    TeableUser {
                        id: String::new(),
                        name: "Teable User".into(),
                        email: String::new(),
                        avatar: None,
                    }
                }
            }
        }
        Ok(resp) => {
            let status = resp.status();
            eprintln!(
                "[TEABLE] /api/auth/user/me returned {} — PAT likely lacks scope, using fallback user info",
                status
            );
            // Token is valid (verified via /api/space) but can't get user details.
            TeableUser {
                id: String::new(),
                name: "Teable User".into(),
                email: String::new(),
                avatar: None,
            }
        }
        Err(e) => {
            eprintln!("[TEABLE] /api/auth/user/me request error: {} — using fallback", e);
            TeableUser {
                id: String::new(),
                name: "Teable User".into(),
                email: String::new(),
                avatar: None,
            }
        }
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

    let client = build_client()?;
    let endpoint = format!("{}/api/space", url.trim_end_matches('/'));

    eprintln!("[TEABLE] Fetching spaces from: {}", endpoint);

    let response = client
        .get(&endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch spaces: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch spaces: {} — {}", status, body));
    }

    let spaces: Vec<TeableSpace> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse spaces response: {}", e))?;

    eprintln!("[TEABLE] Found {} spaces", spaces.len());
    Ok(spaces)
}

/// List all bases in a specific space.
#[tauri::command]
pub async fn list_teable_bases(space_id: String) -> Result<Vec<TeableBase>, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;

    let client = build_client()?;
    let endpoint = format!("{}/api/space/{}/base", url.trim_end_matches('/'), space_id);

    eprintln!("[TEABLE] Fetching bases from: {}", endpoint);

    let response = client
        .get(&endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch bases: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch bases: {} — {}", status, body));
    }

    let bases: Vec<TeableBase> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse bases response: {}", e))?;

    eprintln!("[TEABLE] Found {} bases in space {}", bases.len(), space_id);
    Ok(bases)
}

/// List all tables in a specific base.
#[tauri::command]
pub async fn list_teable_tables(base_id: String) -> Result<Vec<TeableTable>, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;

    let client = build_client()?;
    let endpoint = format!("{}/api/base/{}/table", url.trim_end_matches('/'), base_id);

    eprintln!("[TEABLE] Fetching tables from: {}", endpoint);

    let response = client
        .get(&endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch tables: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch tables: {} — {}", status, body));
    }

    let tables: Vec<TeableTable> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse tables response: {}", e))?;

    eprintln!("[TEABLE] Found {} tables in base {}", tables.len(), base_id);
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

/// A field definition from the Teable API.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeableField {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub field_type: String,
    #[serde(rename = "isPrimary", default)]
    pub is_primary: bool,
}

/// Description of a field that 3devo-gui requires in the target table.
struct RequiredField {
    name: &'static str,
    field_type: &'static str,
    description: &'static str,
}

/// All fields that the experiment row needs.
/// The first entry in the table (primary field) is *not* included here because
/// Teable creates a primary "Title" field automatically.
const REQUIRED_FIELDS: &[RequiredField] = &[
    RequiredField { name: "Created At",             field_type: "singleLineText", description: "Date/time when the experiment was started (ISO 8601)" },
    RequiredField { name: "Operator",               field_type: "singleLineText", description: "Name of the operator (from Teable API token)" },
    RequiredField { name: "Source Material ID",      field_type: "singleLineText", description: "Free-text material identifier" },
    RequiredField { name: "Set RPM",                field_type: "number",          description: "Extruder set RPM at experiment start" },
    RequiredField { name: "Set T4",                 field_type: "number",          description: "Heater 4 set temperature" },
    RequiredField { name: "Set T3",                 field_type: "number",          description: "Heater 3 set temperature" },
    RequiredField { name: "Set T2",                 field_type: "number",          description: "Heater 2 set temperature" },
    RequiredField { name: "Set T1",                 field_type: "number",          description: "Heater 1 set temperature" },
    RequiredField { name: "Fan Percent",            field_type: "number",          description: "Fan speed percentage" },
    RequiredField { name: "Set Diameter",           field_type: "number",          description: "Target filament diameter (1.75 or 2.85 mm)" },
    RequiredField { name: "Filament Weight",        field_type: "number",          description: "Calculated weight (volume × density), filled on stop" },
    RequiredField { name: "Duration",               field_type: "singleLineText", description: "Experiment duration (HH:MM:SS), filled on stop" },
    RequiredField { name: "Experiment Name",        field_type: "singleLineText", description: "Log file name, filled on stop" },
    RequiredField { name: "Color",                  field_type: "singleLineText", description: "Filament color" },
    RequiredField { name: "Manufacturing Location", field_type: "singleLineText", description: "Where the experiment is performed" },
    RequiredField { name: "Notes",                  field_type: "longText",        description: "Free-form notes about the experiment" },
];

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

    let client = build_client()?;
    let base_url = url.trim_end_matches('/');

    // --- Step 1: List existing fields ---
    let list_endpoint = format!("{}/api/table/{}/field", base_url, table_id);
    eprintln!("[TEABLE] Listing fields for table {}", table_id);

    let response = client
        .get(&list_endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Failed to list fields: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to list fields: {} — {}", status, body));
    }

    let existing_fields: Vec<TeableField> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse fields response: {}", e))?;

    let existing_names: std::collections::HashSet<String> = existing_fields
        .iter()
        .map(|f| f.name.clone())
        .collect();

    eprintln!(
        "[TEABLE] Found {} existing fields: {:?}",
        existing_fields.len(),
        existing_names
    );

    // --- Step 2: Create missing fields ---
    let mut created: Vec<String> = Vec::new();
    let create_endpoint = format!("{}/api/table/{}/field", base_url, table_id);

    for required in REQUIRED_FIELDS {
        if existing_names.contains(required.name) {
            continue;
        }

        eprintln!("[TEABLE] Creating missing field: {} ({})", required.name, required.field_type);

        let body = serde_json::json!({
            "type": required.field_type,
            "name": required.name,
            "description": required.description,
        });

        let resp = client
            .post(&create_endpoint)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Failed to create field '{}': {}", required.name, e))?;

        let status = resp.status();
        if !status.is_success() {
            let err_body = resp.text().await.unwrap_or_default();
            // Log but don't abort — try to create the rest
            eprintln!(
                "[TEABLE] Warning: could not create field '{}': {} — {}",
                required.name, status, err_body
            );
            return Err(format!(
                "Failed to create field '{}': {} — {}",
                required.name, status, err_body
            ));
        }

        eprintln!("[TEABLE] Created field: {}", required.name);
        created.push(required.name.to_string());
    }

    if created.is_empty() {
        eprintln!("[TEABLE] All required fields already exist");
    } else {
        eprintln!("[TEABLE] Created {} missing fields: {:?}", created.len(), created);
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
pub async fn create_teable_record(
    fields: serde_json::Value,
) -> Result<TeableRecord, String> {
    let cfg = config::load_config()?;
    let url = cfg.teable_url.ok_or("Teable not configured")?;
    let token = cfg.teable_token.ok_or("Teable token not found")?;
    let table_id = cfg.teable_table_id.ok_or("No Teable table selected")?;

    let client = build_client()?;
    let endpoint = format!("{}/api/table/{}/record", url.trim_end_matches('/'), table_id);

    eprintln!("[TEABLE] Creating record in table {}", table_id);
    eprintln!("[TEABLE] Fields: {}", serde_json::to_string_pretty(&fields).unwrap_or_default());

    let body = serde_json::json!({
        "fieldKeyType": "name",
        "typecast": true,
        "records": [
            {
                "fields": fields
            }
        ]
    });

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            eprintln!("[TEABLE] Failed to create record: {:?}", e);
            format!("Failed to create record: {}", e)
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if !status.is_success() {
        eprintln!("[TEABLE] Create record failed: {} — {}", status, response_text);
        return Err(format!("Failed to create record: {} — {}", status, response_text));
    }

    eprintln!("[TEABLE] Create record response: {}", response_text);

    // Response is { "records": [ { "id": "...", "fields": { ... } } ] }
    let wrapper: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {} — body: {}", e, response_text))?;

    let record_val = wrapper
        .get("records")
        .and_then(|r| r.as_array())
        .and_then(|arr| arr.first())
        .ok_or_else(|| format!("No record in response: {}", response_text))?;

    let record: TeableRecord = serde_json::from_value(record_val.clone())
        .map_err(|e| format!("Failed to parse record: {} — value: {}", e, record_val))?;

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

    let client = build_client()?;
    let endpoint = format!(
        "{}/api/table/{}/record/{}",
        url.trim_end_matches('/'),
        table_id,
        record_id
    );

    eprintln!("[TEABLE] Updating record {} in table {}", record_id, table_id);
    eprintln!("[TEABLE] Fields: {}", serde_json::to_string_pretty(&fields).unwrap_or_default());

    let body = serde_json::json!({
        "fieldKeyType": "name",
        "typecast": true,
        "record": {
            "fields": fields
        }
    });

    let response = client
        .patch(&endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            eprintln!("[TEABLE] Failed to update record: {:?}", e);
            format!("Failed to update record: {}", e)
        })?;

    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();

    if !status.is_success() {
        eprintln!("[TEABLE] Update record failed: {} — {}", status, response_text);
        return Err(format!("Failed to update record: {} — {}", status, response_text));
    }

    eprintln!("[TEABLE] Update record response: {}", response_text);

    let record: TeableRecord = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse record response: {} — body: {}", e, response_text))?;

    eprintln!("[TEABLE] Record {} updated", record.id);
    Ok(record)
}
