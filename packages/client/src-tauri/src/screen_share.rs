/// Screen share related Tauri commands
/// Provides platform detection and window management for screen sharing

/// Get the current platform (windows, macos, linux)
#[tauri::command]
pub fn get_platform() -> String {
    #[cfg(target_os = "windows")]
    {
        "windows".to_string()
    }
    #[cfg(target_os = "macos")]
    {
        "macos".to_string()
    }
    #[cfg(target_os = "linux")]
    {
        "linux".to_string()
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        "unknown".to_string()
    }
}

/// Minimize the main window when screen sharing starts
#[tauri::command]
pub async fn minimize_main_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Restore the main window when screen sharing ends
#[tauri::command]
pub async fn restore_main_window(window: tauri::Window) -> Result<(), String> {
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}
