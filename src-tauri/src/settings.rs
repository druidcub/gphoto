use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

fn default_duration() -> u64 { 15 }
fn default_true() -> bool { true }

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
pub struct MiniWindowBounds { pub x: i32, pub y: i32, pub width: u32, pub height: u32 }
impl Default for MiniWindowBounds {
    fn default() -> Self { Self { x: 80, y: 80, width: 640, height: 360 } }
}
impl MiniWindowBounds {
    fn normalize(&mut self) {
        self.width = self.width.clamp(320, 7680);
        self.height = self.height.clamp(180, 4320);
    }
}
fn normalize_duration(value: u64) -> u64 {
    if [10, 15, 30, 60, 120, 300].contains(&value) { value } else { 15 }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub source_mode: String,
    pub album_url: String,
    pub local_folder_path: String,
    pub immersive_mode: bool,
    pub max_upscale: f64,
    pub sync_interval_minutes: u64,
    #[serde(default = "default_duration")]
    pub slide_duration_seconds: u64,
    #[serde(default = "default_true")]
    pub soft_mode: bool,
    #[serde(default)]
    pub mini_window_mode: bool,
    #[serde(default)]
    pub mini_window_bounds: MiniWindowBounds,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            source_mode: "googlePhotos".into(),
            album_url: String::new(),
            local_folder_path: String::new(),
            immersive_mode: true,
            max_upscale: 2.0,
            sync_interval_minutes: 5,
            slide_duration_seconds: 15,
            soft_mode: true,
            mini_window_mode: false,
            mini_window_bounds: MiniWindowBounds::default(),
        }
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir()
        .map(|path| path.join("settings.json"))
        .map_err(|error| format!("無法取得設定目錄：{error}"))
}

pub fn load(app: &AppHandle) -> Result<AppSettings, String> {
    load_path(&settings_path(app)?)
}

fn load_path(path: &std::path::Path) -> Result<AppSettings, String> {
    if !path.exists() { return Ok(AppSettings::default()); }
    let bytes = fs::read(&path).map_err(|error| format!("無法讀取設定：{error}"))?;
    let mut settings: AppSettings = serde_json::from_slice(&bytes)
        .map_err(|error| format!("設定格式無效：{error}"))?;
    settings.max_upscale = 2.0;
    settings.mini_window_bounds.normalize();
    settings.slide_duration_seconds = normalize_duration(settings.slide_duration_seconds);
    Ok(settings)
}

pub fn save(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    save_path(&settings_path(app)?, settings)
}

fn save_path(path: &std::path::Path, settings: &AppSettings) -> Result<(), String> {
    let parent = path.parent().ok_or("設定路徑無效")?;
    fs::create_dir_all(parent).map_err(|error| format!("無法建立設定目錄：{error}"))?;
    let temporary = path.with_extension("json.tmp");
    let mut normalized = settings.clone();
    normalized.max_upscale = 2.0;
    normalized.mini_window_bounds.normalize();
    normalized.slide_duration_seconds = normalize_duration(normalized.slide_duration_seconds);
    let bytes = serde_json::to_vec_pretty(&normalized).map_err(|error| error.to_string())?;
    fs::write(&temporary, bytes).map_err(|error| format!("無法寫入設定：{error}"))?;
    if path.exists() { fs::remove_file(&path).map_err(|error| format!("無法更新設定：{error}"))?; }
    fs::rename(&temporary, &path).map_err(|error| format!("無法完成設定儲存：{error}"))
}

#[cfg(test)]
mod tests {
    use super::{load_path, save_path, AppSettings};

    #[test]
    fn settings_round_trip_and_default_when_missing() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("settings.json");
        assert_eq!(load_path(&path).unwrap(), AppSettings::default());
        assert!(load_path(&path).unwrap().album_url.is_empty());
        let mut settings = AppSettings::default();
        settings.immersive_mode = false;
        settings.max_upscale = 1.5;
        settings.slide_duration_seconds = 120;
        settings.album_url = "https://photos.google.com/share/example".into();
        settings.local_folder_path = "saved-local-folder".into();
        save_path(&path, &settings).unwrap();
        settings.max_upscale = 2.0;
        assert_eq!(load_path(&path).unwrap(), settings);
        assert!(!path.with_extension("json.tmp").exists());
    }

    #[test]
    fn migrates_old_settings_and_rejects_invalid_duration() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("settings.json");
        let mut old = serde_json::to_value(AppSettings::default()).unwrap();
        old.as_object_mut().unwrap().remove("slideDurationSeconds");
        old.as_object_mut().unwrap().remove("softMode");
        old.as_object_mut().unwrap().remove("miniWindowMode");
        old.as_object_mut().unwrap().remove("miniWindowBounds");
        std::fs::write(&path, serde_json::to_vec(&old).unwrap()).unwrap();
        assert_eq!(load_path(&path).unwrap().slide_duration_seconds, 15);
        assert!(load_path(&path).unwrap().soft_mode);
        assert!(!load_path(&path).unwrap().mini_window_mode);
        assert_eq!(load_path(&path).unwrap().mini_window_bounds.width, 640);
        for seconds in [10, 15, 30, 60, 120, 300, 0, 301] {
            let mut settings = AppSettings::default();
            settings.slide_duration_seconds = seconds;
            save_path(&path, &settings).unwrap();
            assert_eq!(load_path(&path).unwrap().slide_duration_seconds,
                if seconds == 0 || seconds == 301 { 15 } else { seconds });
        }
    }

    #[test]
    fn persists_modes_and_clamps_mini_window_size() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("settings.json");
        let mut settings = AppSettings::default();
        settings.soft_mode = false;
        settings.mini_window_mode = true;
        settings.mini_window_bounds.width = 0;
        settings.mini_window_bounds.height = 10000;
        settings.mini_window_bounds.x = -640;
        save_path(&path, &settings).unwrap();
        let actual = load_path(&path).unwrap();
        assert!(!actual.soft_mode);
        assert!(actual.mini_window_mode);
        assert_eq!(actual.mini_window_bounds.width, 320);
        assert_eq!(actual.mini_window_bounds.height, 4320);
        assert_eq!(actual.mini_window_bounds.x, -640);
    }
}
