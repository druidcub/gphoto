// Execution-state requests are thread scoped: always set/clear on Tauri's main thread.
#[cfg(windows)]
#[link(name = "kernel32")]
extern "system" { fn SetThreadExecutionState(flags: u32) -> u32; }

pub fn set_awake(enabled: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        const CONTINUOUS: u32 = 0x80000000;
        let flags = CONTINUOUS | if enabled { 0x00000001 | 0x00000002 } else { 0 };
        if unsafe { SetThreadExecutionState(flags) } == 0 {
            return Err("無法更新 Windows 顯示器防休眠狀態".into());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn set_display_awake(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let (send, receive) = tokio::sync::oneshot::channel();
    app.run_on_main_thread(move || { let _ = send.send(set_awake(enabled)); })
        .map_err(|error| error.to_string())?;
    receive.await.map_err(|error| error.to_string())?
}
