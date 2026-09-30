use std::{ffi::{c_char, c_void}, sync::Mutex};
use super::lease::Lease;

type CFStringRef = *const c_void;
#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFStringCreateWithCString(allocator: *const c_void, text: *const c_char, encoding: u32) -> CFStringRef;
    fn CFRelease(value: *const c_void);
}
#[link(name = "IOKit", kind = "framework")]
extern "C" {
    fn IOPMAssertionCreateWithName(kind: CFStringRef, level: u32, name: CFStringRef, id: *mut u32) -> i32;
    fn IOPMAssertionRelease(id: u32) -> i32;
}
static ASSERTION: Mutex<Lease> = Mutex::new(Lease(None));

fn create() -> Result<u32, String> {
    unsafe {
        let kind = CFStringCreateWithCString(std::ptr::null(), b"PreventUserIdleDisplaySleep\0".as_ptr().cast(), 0x08000100);
        let name = CFStringCreateWithCString(std::ptr::null(), b"GPhoto Frame fullscreen playback\0".as_ptr().cast(), 0x08000100);
        if kind.is_null() || name.is_null() {
            if !kind.is_null() { CFRelease(kind); }
            if !name.is_null() { CFRelease(name); }
            return Err("無法建立 macOS 電源管理描述".into());
        }
        let mut id = 0;
        let result = IOPMAssertionCreateWithName(kind, 255, name, &mut id);
        CFRelease(kind); CFRelease(name);
        if result == 0 { Ok(id) } else { Err(format!("無法啟用 macOS 顯示器防休眠：{result}")) }
    }
}
pub fn set_awake(enabled: bool) -> Result<(), String> {
    ASSERTION.lock().map_err(|_| "電源管理狀態鎖定失敗".to_string())?
        .update(enabled, create, |id| {
            let result = unsafe { IOPMAssertionRelease(id) };
            if result == 0 { Ok(()) } else { Err(format!("無法解除 macOS 防休眠：{result}")) }
        })
}
