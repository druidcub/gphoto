mod google_photos;
mod settings;
mod power;
mod atomic_file;

use std::{fs, path::{Path, PathBuf}};
use tauri::{ipc::Channel, AppHandle, Manager};

use google_photos::{SyncEvent, SyncSummary};
use settings::AppSettings;

const PHOTO_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp"];

#[tauri::command]
fn platform_info() -> &'static str {
    if cfg!(windows) { "windows" } else if cfg!(target_os = "macos") { "macos" } else { "other" }
}

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
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let menu = tauri::menu::Menu::default(app.handle())?;
                // Let the shared player handle Ctrl+Cmd+F: the default native
                // View shortcut would bypass mini-window and power-state guards.
                for item in menu.items()? {
                    if let tauri::menu::MenuItemKind::Submenu(submenu) = item {
                        if submenu.text()? == "View" { menu.remove(&submenu)?; }
                    }
                }
                app.set_menu(menu)?;
            }
            // macOS minimization does not reliably emit a resize event. Poll native
            // visibility as a backstop, with the power request still playback-gated.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    let app = handle.clone();
                    if handle.run_on_main_thread(move || {
                        if let Some(window) = app.get_webview_window("main") {
                            let active = window.is_fullscreen().unwrap_or(false) && !window.is_minimized().unwrap_or(true) && window.is_visible().unwrap_or(false);
                            let _ = power::refresh(active);
                        }
                    }).is_err() { break; }
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                let _ = power::set_awake(false);
                window.app_handle().exit(0);
            }
            if matches!(event, tauri::WindowEvent::Destroyed) { let _ = power::set_awake(false); }
            if matches!(event, tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(_)) {
                let active = window.is_fullscreen().unwrap_or(false) && !window.is_minimized().unwrap_or(true);
                let _ = power::refresh(active);
            }
        })
        .invoke_handler(tauri::generate_handler![
            scan_photo_folder,
            load_settings,
            save_settings,
            sync_google_album,
            power::set_display_awake,
            platform_info
        ])
        .build(tauri::generate_context!())
        .expect("failed to build GPhoto Frame")
        .run(|_, event| {
            if matches!(event, tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) {
                let _ = power::set_awake(false);
            }
        });
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
