#[cfg(windows)]
#[path = "power/windows.rs"]
mod platform;
#[cfg(target_os = "macos")]
#[path = "power/macos.rs"]
mod platform;
#[cfg(any(target_os = "macos", test))]
#[path = "power/lease.rs"]
mod lease;
use std::sync::atomic::{AtomicBool, Ordering};
static REQUESTED: AtomicBool = AtomicBool::new(false);

pub fn refresh(fullscreen_and_visible: bool) -> Result<(), String> {
    set_awake(REQUESTED.load(Ordering::SeqCst) && fullscreen_and_visible)
}

pub fn set_awake(enabled: bool) -> Result<(), String> {
    #[cfg(any(windows, target_os = "macos"))]
    { platform::set_awake(enabled) }
    #[cfg(not(any(windows, target_os = "macos")))]
    { if enabled { Err("此平台尚不支援顯示器防休眠".into()) } else { Ok(()) } }
}

#[tauri::command]
pub async fn set_display_awake(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let (send, receive) = tokio::sync::oneshot::channel();
    app.run_on_main_thread(move || {
        let result = set_awake(enabled);
        if result.is_ok() { REQUESTED.store(enabled, Ordering::SeqCst); }
        let _ = send.send(result);
    })
        .map_err(|error| error.to_string())?;
    receive.await.map_err(|error| error.to_string())?
}
