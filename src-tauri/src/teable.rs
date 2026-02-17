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
