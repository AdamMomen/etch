/// Floating windows for participants and annotation toolbar
/// Provides commands to create/destroy small always-on-top windows that can be positioned
/// anywhere on the screen, even outside the main app window.

use tauri::webview::WebviewWindowBuilder;
use tauri::{AppHandle, Manager, WebviewUrl};

// Window labels for identifying windows
const PARTICIPANTS_WINDOW_LABEL: &str = "participants-window";
const TOOLBAR_WINDOW_LABEL: &str = "toolbar-window";

/// Create the participants floating window
/// Shows participant video bubbles in a small always-on-top window
#[tauri::command]
pub async fn create_participants_window(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if app.get_webview_window(PARTICIPANTS_WINDOW_LABEL).is_some() {
        log::info!("Participants window already exists");
        return Ok(());
    }

    // Build URL for the participants window route
    let url = WebviewUrl::App("/participants-window".into());

    log::info!("Creating participants window...");

    let builder = WebviewWindowBuilder::new(&app, PARTICIPANTS_WINDOW_LABEL, url)
        .title("Participants")
        .inner_size(240.0, 80.0) // Compact horizontal layout for bubbles
        .min_inner_size(200.0, 60.0)
        .decorations(false) // Frameless for cleaner look
        .transparent(true) // For backdrop blur effect
        .always_on_top(true) // Stay above other windows
        .skip_taskbar(true) // Don't show in taskbar
        .visible(true)
        .focused(false) // Don't steal focus
        .resizable(true); // Allow resizing for different monitor sizes

    let window = builder
        .build()
        .map_err(|e| format!("Failed to create participants window: {}", e))?;

    // Position window at bottom-right by default
    // User can drag it to their preferred location
    if let Ok(monitor) = window.current_monitor() {
        if let Some(monitor) = monitor {
            let size = monitor.size();
            let window_size = window.outer_size().unwrap_or_default();

            // Position with 20px padding from bottom-right corner
            let x = (size.width - window_size.width).saturating_sub(20);
            let y = (size.height - window_size.height).saturating_sub(20);

            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: x as i32,
                y: y as i32,
            }));
        }
    }

    log::info!("Participants window created successfully");
    Ok(())
}

/// Destroy the participants floating window
#[tauri::command]
pub async fn destroy_participants_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(PARTICIPANTS_WINDOW_LABEL)
        .ok_or_else(|| "Participants window does not exist".to_string())?;

    log::info!("Destroying participants window");
    window
        .destroy()
        .map_err(|e| format!("Failed to destroy participants window: {}", e))?;

    log::info!("Participants window destroyed successfully");
    Ok(())
}

/// Check if participants window exists
#[tauri::command]
pub fn is_participants_window_active(app: AppHandle) -> bool {
    app.get_webview_window(PARTICIPANTS_WINDOW_LABEL).is_some()
}

/// Create the annotation toolbar floating window
/// Shows annotation tool controls in a small always-on-top window
#[tauri::command]
pub async fn create_toolbar_window(app: AppHandle) -> Result<(), String> {
    // Check if window already exists
    if app.get_webview_window(TOOLBAR_WINDOW_LABEL).is_some() {
        log::info!("Toolbar window already exists");
        return Ok(());
    }

    // Build URL for the toolbar window route
    let url = WebviewUrl::App("/toolbar-window".into());

    log::info!("Creating toolbar window...");

    let builder = WebviewWindowBuilder::new(&app, TOOLBAR_WINDOW_LABEL, url)
        .title("Annotation Toolbar")
        .inner_size(360.0, 60.0) // Wide enough for all toolbar buttons
        .min_inner_size(300.0, 50.0)
        .decorations(false) // Frameless for cleaner look
        .transparent(true) // For backdrop blur effect
        .always_on_top(true) // Stay above other windows
        .skip_taskbar(true) // Don't show in taskbar
        .visible(true)
        .focused(false) // Don't steal focus
        .resizable(false); // Fixed size for toolbar consistency

    let window = builder
        .build()
        .map_err(|e| format!("Failed to create toolbar window: {}", e))?;

    // Position window at top-center by default
    // User can drag it to their preferred location
    if let Ok(monitor) = window.current_monitor() {
        if let Some(monitor) = monitor {
            let size = monitor.size();
            let window_size = window.outer_size().unwrap_or_default();

            // Center horizontally, position near top with 20px padding
            let x = (size.width - window_size.width) / 2;
            let y = 20;

            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: x as i32,
                y: y as i32,
            }));
        }
    }

    log::info!("Toolbar window created successfully");
    Ok(())
}

/// Destroy the annotation toolbar floating window
#[tauri::command]
pub async fn destroy_toolbar_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(TOOLBAR_WINDOW_LABEL)
        .ok_or_else(|| "Toolbar window does not exist".to_string())?;

    log::info!("Destroying toolbar window");
    window
        .destroy()
        .map_err(|e| format!("Failed to destroy toolbar window: {}", e))?;

    log::info!("Toolbar window destroyed successfully");
    Ok(())
}

/// Check if toolbar window exists
#[tauri::command]
pub fn is_toolbar_window_active(app: AppHandle) -> bool {
    app.get_webview_window(TOOLBAR_WINDOW_LABEL).is_some()
}
