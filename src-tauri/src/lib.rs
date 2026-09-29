mod google_photos;
mod settings;
mod power;

use std::{fs, path::{Path, PathBuf}};
use tauri::{ipc::Channel, AppHandle, Manager};

use google_photos::{SyncEvent, SyncSummary};
use settings::AppSettings;

const PHOTO_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp"];

fn is_supported_photo(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| PHOTO_EXTENSIONS.iter().any(|item| extension.eq_ignore_ascii_case(item)))
        .unwrap_or(false)
}

#[tauri::command]
fn scan_photo_folder(app: AppHandle, folder_path: String) -> Result<Vec<String>, String> {
    let folder = PathBuf::from(&folder_path);
    if !folder.is_dir() {
        return Err("選取的路徑不是有效的資料夾。".to_string());
    }
    let mut photos = fs::read_dir(&folder)
        .map_err(|error| format!("無法讀取資料夾：{error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_supported_photo(path))
        .map(|path| path.to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    photos.sort_by_key(|path| path.to_lowercase());
    for path in &photos {
        app.asset_protocol_scope().allow_file(path).map_err(|error| error.to_string())?;
    }
    Ok(photos)
}

#[tauri::command]
fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    let mut settings = settings::load(&app)?;
    if settings.local_folder_path.is_empty() {
        settings.local_folder_path = google_photos::cache_files_directory(&app)?.to_string_lossy().into_owned();
    }
    Ok(settings)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    settings::save(&app, &settings)
}

#[tauri::command]
async fn sync_google_album(
    app: AppHandle,
    album_url: String,
    on_event: Channel<SyncEvent>,
) -> Result<SyncSummary, String> {
    google_photos::sync_album(&app, &album_url, on_event).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) { let _ = power::set_awake(false); }
            if matches!(event, tauri::WindowEvent::Resized(_)) {
                let active = window.is_fullscreen().unwrap_or(false) && !window.is_minimized().unwrap_or(true);
                let _ = power::set_awake(active);
            }
        })
        .invoke_handler(tauri::generate_handler![
            scan_photo_folder,
            load_settings,
            save_settings,
            sync_google_album,
            power::set_display_awake
        ])
        .run(tauri::generate_context!())
        .expect("failed to run GPhoto Frame");
}

#[cfg(test)]
mod tests {
    use super::is_supported_photo;
    use std::path::Path;

    #[test]
    fn accepts_supported_extensions_case_insensitively() {
        assert!(is_supported_photo(Path::new("photo.JPG")));
        assert!(is_supported_photo(Path::new("photo.webp")));
    }

    #[test]
    fn rejects_non_photo_extensions() {
        assert!(!is_supported_photo(Path::new("notes.txt")));
        assert!(!is_supported_photo(Path::new("photo.gif")));
    }
}
