use serde::{Deserialize, Serialize};

/// Application configuration persisted between sessions.
///
/// Stored as a TOML file in the platform-appropriate config directory
/// (e.g. `~/.config/devo-gui/` on Linux) via the `confy` crate.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    /// Directory path where log files and other output files are saved.
    pub output_path: String,
    /// URL of the self-hosted Teable instance (e.g. "https://teable.example.com").
    pub teable_url: Option<String>,
    /// Personal access token for authenticating with the Teable API.
    pub teable_token: Option<String>,
    /// Display name of the Teable user (cached from API).
    pub teable_user_name: Option<String>,
    /// Email of the Teable user (cached from API).
    pub teable_user_email: Option<String>,
    /// Avatar URL of the Teable user (cached from API).
    pub teable_user_avatar: Option<String>,
    /// Selected Teable space ID.
    pub teable_space_id: Option<String>,
    /// Selected Teable base ID.
    pub teable_base_id: Option<String>,
    /// Selected Teable table ID (where data rows will be created).
    pub teable_table_id: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        // Default to the user's Documents folder if available, otherwise empty
        let default_path = dirs::document_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        Self {
            output_path: default_path,
            teable_url: None,
            teable_token: None,
            teable_user_name: None,
            teable_user_email: None,
            teable_user_avatar: None,
            teable_space_id: None,
            teable_base_id: None,
            teable_table_id: None,
        }
    }
}

/// The application name used as the confy config identifier.
/// Config file will be stored at e.g. `~/.config/devo-gui/default-config.toml`
pub const APP_NAME: &str = "devo-gui";

/// Load the application config from disk (or create default).
pub fn load_config() -> Result<AppConfig, String> {
    confy::load(APP_NAME, None).map_err(|e| format!("Failed to load config: {}", e))
}

/// Save the application config to disk.
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    confy::store(APP_NAME, None, config).map_err(|e| format!("Failed to save config: {}", e))
}
