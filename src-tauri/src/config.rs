use serde::{Deserialize, Serialize};

/// Application configuration persisted between sessions.
///
/// Stored as a TOML file in the platform-appropriate config directory
/// (e.g. `~/.config/devo-gui/` on Linux) via the `confy` crate.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    /// Directory path where log files and other output files are saved.
    pub output_path: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        // Default to the user's Documents folder if available, otherwise empty
        let default_path = dirs::document_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        Self {
            output_path: default_path,
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
