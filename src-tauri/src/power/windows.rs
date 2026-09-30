#[link(name = "kernel32")]
extern "system" { fn SetThreadExecutionState(flags: u32) -> u32; }

pub fn set_awake(enabled: bool) -> Result<(), String> {
    let flags = 0x80000000 | if enabled { 0x00000001 | 0x00000002 } else { 0 };
    if unsafe { SetThreadExecutionState(flags) } == 0 {
        Err("無法更新 Windows 顯示器防休眠狀態".into())
    } else { Ok(()) }
}
