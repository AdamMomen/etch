/// Screen share related Tauri commands
/// Provides platform detection, window management, and Core process management
///
/// Uses Tauri's sidecar mechanism so Core inherits screen recording permission
/// from the parent NAMELESS app.

use std::io::{BufRead, BufReader, Write};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::webview::WebviewWindowBuilder;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

#[cfg(unix)]
use std::os::unix::net::UnixStream;

/// State to hold the running Core process and socket connection
pub struct CoreState {
    /// The Core child process (sidecar)
    pub child: Mutex<Option<CommandChild>>,
    /// Path to the socket for communication
    pub socket_path: Mutex<Option<String>>,
    /// Socket connection for sending messages
    #[cfg(unix)]
    pub socket: Mutex<Option<UnixStream>>,
    #[cfg(windows)]
    pub socket: Mutex<Option<std::net::TcpStream>>,
}

impl Default for CoreState {
    fn default() -> Self {
        Self {
            child: Mutex::new(None),
            socket_path: Mutex::new(None),
            socket: Mutex::new(None),
        }
    }
}

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

/// Monitor info returned to frontend
#[derive(Debug, Clone, serde::Serialize)]
pub struct WindowMonitorInfo {
    /// Monitor position X
    pub x: i32,
    /// Monitor position Y
    pub y: i32,
    /// Monitor width
    pub width: u32,
    /// Monitor height
    pub height: u32,
}

/// Get the monitor that the main window is currently on
/// Returns the monitor's position and size so frontend can compare with selected screen
#[tauri::command]
pub async fn get_window_monitor(window: tauri::Window) -> Result<Option<WindowMonitorInfo>, String> {
    // Get the monitor that contains the window
    let monitor = window.current_monitor().map_err(|e| e.to_string())?;

    match monitor {
        Some(m) => {
            let position = m.position();
            let size = m.size();
            Ok(Some(WindowMonitorInfo {
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
            }))
        }
        None => Ok(None),
    }
}

/// Generate a unique socket path for this instance
fn generate_socket_path() -> String {
    let pid = std::process::id();

    #[cfg(unix)]
    {
        format!("/tmp/nameless-core-{}.sock", pid)
    }
    #[cfg(windows)]
    {
        // On Windows, we use TCP instead of named pipes for simplicity
        format!("127.0.0.1:{}", 9876 + (pid % 1000))
    }
}

/// Spawn the Core binary using Tauri's sidecar mechanism
/// This ensures Core inherits screen recording permission from the parent app
#[tauri::command]
pub async fn spawn_core(app: AppHandle, state: State<'_, CoreState>) -> Result<String, String> {
    // Check if Core is already running
    {
        let child = state.child.lock().map_err(|e| e.to_string())?;
        if child.is_some() {
            return Err("Core already running".to_string());
        }
    }

    // Generate socket path
    let socket_path = generate_socket_path();
    log::info!("Socket path: {}", socket_path);

    // Store socket path
    {
        let mut path = state.socket_path.lock().map_err(|e| e.to_string())?;
        *path = Some(socket_path.clone());
    }

    // Use Tauri's sidecar API - this spawns the binary with inherited permissions
    // Enable debug logging for LiveKit/WebRTC to diagnose connection issues
    let sidecar_command = app
        .shell()
        .sidecar("nameless-core")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .env("RUST_LOG", "nameless_core=debug,livekit=debug,webrtc=info")
        .args([&socket_path]);

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn Core sidecar: {}", e))?;

    log::info!("Core sidecar spawned successfully");

    // Store the child process
    {
        let mut state_child = state.child.lock().map_err(|e| e.to_string())?;
        *state_child = Some(child);
    }

    // Spawn a task to handle sidecar stdout/stderr events
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    log::info!("[Core] {}", line_str);
                }
                CommandEvent::Stderr(line) => {
                    let line_str = String::from_utf8_lossy(&line);
                    log::info!("Core: {}", line_str);
                }
                CommandEvent::Error(err) => {
                    log::error!("Core error: {}", err);
                }
                CommandEvent::Terminated(payload) => {
                    log::info!("Core terminated with code: {:?}", payload.code);
                    // Emit termination event to frontend
                    let _ = app_handle.emit("core-terminated", payload.code);
                    break;
                }
                _ => {}
            }
        }
    });

    // Wait a moment for Core to start its socket server
    std::thread::sleep(Duration::from_millis(500));

    // Connect to the socket
    #[cfg(unix)]
    {
        let stream = UnixStream::connect(&socket_path)
            .map_err(|e| format!("Failed to connect to Core socket: {}", e))?;

        // Set non-blocking for reads
        stream
            .set_nonblocking(false)
            .map_err(|e| format!("Failed to set non-blocking: {}", e))?;

        // Clone for the reader thread
        let reader_stream = stream
            .try_clone()
            .map_err(|e| format!("Failed to clone stream: {}", e))?;

        // Store the writer stream
        {
            let mut socket = state.socket.lock().map_err(|e| e.to_string())?;
            *socket = Some(stream);
        }

        // Spawn a thread to read from the socket and emit events
        let app_handle = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(reader_stream);
            for line in reader.lines() {
                match line {
                    Ok(json) => {
                        log::info!("[Core →] {}", json);
                        // Emit to frontend
                        if let Err(e) = app_handle.emit("core-message", json) {
                            log::error!("Failed to emit core-message: {}", e);
                        }
                    }
                    Err(e) => {
                        log::error!("Socket read error: {}", e);
                        break;
                    }
                }
            }
            log::info!("Socket reader thread ended");
        });
    }

    #[cfg(windows)]
    {
        // On Windows, parse the socket_path as host:port
        let stream = std::net::TcpStream::connect(&socket_path)
            .map_err(|e| format!("Failed to connect to Core socket: {}", e))?;

        // Clone for the reader thread
        let reader_stream = stream
            .try_clone()
            .map_err(|e| format!("Failed to clone stream: {}", e))?;

        // Store the writer stream
        {
            let mut socket = state.socket.lock().map_err(|e| e.to_string())?;
            *socket = Some(stream);
        }

        // Spawn a thread to read from the socket and emit events
        let app_handle = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(reader_stream);
            for line in reader.lines() {
                match line {
                    Ok(json) => {
                        log::info!("[Core →] {}", json);
                        if let Err(e) = app_handle.emit("core-message", json) {
                            log::error!("Failed to emit core-message: {}", e);
                        }
                    }
                    Err(e) => {
                        log::error!("Socket read error: {}", e);
                        break;
                    }
                }
            }
            log::info!("Socket reader thread ended");
        });
    }

    log::info!("Core spawned and connected successfully");
    Ok(socket_path)
}

/// Stop the Core process
#[tauri::command]
pub async fn kill_core(state: State<'_, CoreState>) -> Result<(), String> {
    // Send shutdown message first
    {
        let mut socket = state.socket.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut stream) = *socket {
            let msg = r#"{"type":"shutdown"}"#;
            let _ = stream.write_all(format!("{}\n", msg).as_bytes());
            let _ = stream.flush();
        }
        *socket = None;
    }

    // Wait a moment for graceful shutdown
    std::thread::sleep(Duration::from_millis(200));

    // Kill the process if still running
    let mut child = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(process) = child.take() {
        log::info!("Killing Core process...");
        let _ = process.kill();
    }

    // Clean up socket path
    {
        let mut path = state.socket_path.lock().map_err(|e| e.to_string())?;
        if let Some(socket_path) = path.take() {
            #[cfg(unix)]
            {
                let _ = std::fs::remove_file(&socket_path);
            }
        }
    }

    log::info!("Core stopped");
    Ok(())
}

/// Send a message to Core via socket
#[tauri::command]
pub fn send_core_message(state: State<'_, CoreState>, message: String) -> Result<(), String> {
    log::info!("[Core ←] {}", message);
    let mut socket = state.socket.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut stream) = *socket {
        stream
            .write_all(format!("{}\n", message).as_bytes())
            .map_err(|e| format!("Failed to write to Core: {}", e))?;
        stream.flush().map_err(|e| format!("Failed to flush: {}", e))?;
        Ok(())
    } else {
        Err("Core not running".to_string())
    }
}

/// Check if Core is running
#[tauri::command]
pub fn is_core_running(state: State<'_, CoreState>) -> bool {
    let child = state.child.lock().ok();
    child.map(|c| c.is_some()).unwrap_or(false)
}

/// Check screen recording permission
#[tauri::command]
pub fn check_screen_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        // Permission is checked by Core process
        // The sidecar inherits permission from the parent app
        true
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

// ============================================================================
// Annotation Overlay Window Management (Story 3.6)
// ============================================================================

/// Configuration for the overlay window bounds
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct OverlayBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Create a transparent annotation overlay window positioned over the shared content
/// This window is click-through and always-on-top, serving as a canvas for annotations
#[tauri::command]
pub async fn create_annotation_overlay(
    app: AppHandle,
    bounds: OverlayBounds,
) -> Result<(), String> {
    const OVERLAY_LABEL: &str = "annotation-overlay";

    // Check if overlay already exists
    if app.get_webview_window(OVERLAY_LABEL).is_some() {
        return Err("Annotation overlay already exists".to_string());
    }

    log::info!(
        "Creating annotation overlay at ({}, {}) with size {}x{}",
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
    );

    // Build the overlay window
    // Using a data URL for minimal content - just a transparent page
    // Epic 4 will replace this with actual annotation canvas content
    //
    // DEBUG_OVERLAY=1 shows red debug overlay, otherwise shows subtle professional UI
    let debug_mode = std::env::var("DEBUG_OVERLAY").map(|v| v == "1").unwrap_or(false);
    log::info!("Overlay debug mode: {}", debug_mode);

    let overlay_html = if debug_mode {
        // Debug mode: bright red overlay for visibility testing
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; }
                html, body {
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 0, 0, 0.3);
                    overflow: hidden;
                    border: 8px solid red;
                    box-sizing: border-box;
                }
                #debug {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 48px;
                    color: white;
                    text-shadow: 2px 2px 4px black;
                    font-family: sans-serif;
                }
            </style>
        </head>
        <body>
            <div id="debug">OVERLAY ACTIVE</div>
        </body>
        </html>
        "#.to_string()
    } else {
        // Production mode: minimal - just a subtle border indicating sharing
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; }
                html, body {
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    overflow: hidden;
                    border: 2px solid rgba(59, 130, 246, 0.4);
                    box-sizing: border-box;
                }
            </style>
        </head>
        <body></body>
        </html>
        "#.to_string()
    };

    let data_url = format!(
        "data:text/html;base64,{}",
        base64_encode(overlay_html.as_bytes())
    );

    log::info!("Parsing data URL...");
    let url = data_url.parse().map_err(|e| {
        log::error!("Failed to parse data URL: {}", e);
        format!("Invalid URL: {}", e)
    })?;

    log::info!("Building overlay window...");
    let builder = WebviewWindowBuilder::new(&app, OVERLAY_LABEL, WebviewUrl::External(url))
        .title("Annotation Overlay")
        .inner_size(bounds.width as f64, bounds.height as f64)
        .position(bounds.x as f64, bounds.y as f64)
        .decorations(false)
        .transparent(true)  // Requires macos-private-api feature
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(true)
        .focused(false)
        .resizable(false);

    log::info!("Calling builder.build()...");
    let window = match builder.build() {
        Ok(w) => {
            log::info!("Window built successfully");
            w
        }
        Err(e) => {
            log::error!("builder.build() failed: {}", e);
            return Err(format!("Failed to create overlay window: {}", e));
        }
    };

    // Configure click-through behavior (platform-specific)
    log::info!("Configuring click-through...");
    if let Err(e) = configure_click_through(&window) {
        log::error!("configure_click_through failed: {}", e);
        return Err(e);
    }

    log::info!("Annotation overlay created successfully");
    Ok(())
}

/// Destroy the annotation overlay window
#[tauri::command]
pub async fn destroy_annotation_overlay(app: AppHandle) -> Result<(), String> {
    const OVERLAY_LABEL: &str = "annotation-overlay";

    let window = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "Annotation overlay does not exist".to_string())?;

    log::info!("Destroying annotation overlay");
    window
        .destroy()
        .map_err(|e| format!("Failed to destroy overlay: {}", e))?;

    log::info!("Annotation overlay destroyed successfully");
    Ok(())
}

/// Update the position and size of the annotation overlay
/// Used for tracking window position when sharing a specific window
#[tauri::command]
pub async fn update_overlay_bounds(app: AppHandle, bounds: OverlayBounds) -> Result<(), String> {
    const OVERLAY_LABEL: &str = "annotation-overlay";

    let window = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "Annotation overlay does not exist".to_string())?;

    // Update position
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: bounds.x,
            y: bounds.y,
        }))
        .map_err(|e| format!("Failed to set position: {}", e))?;

    // Update size
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: bounds.width,
            height: bounds.height,
        }))
        .map_err(|e| format!("Failed to set size: {}", e))?;

    Ok(())
}

/// Check if the annotation overlay exists
#[tauri::command]
pub fn is_overlay_active(app: AppHandle) -> bool {
    app.get_webview_window("annotation-overlay").is_some()
}

/// Get window bounds by title (for window tracking during window shares)
/// This is used to track the position of a shared window and keep the overlay aligned
/// Note: Window tracking by ID/title has platform-specific limitations
#[tauri::command]
pub async fn get_window_bounds_by_title(
    _title: String,
) -> Result<Option<OverlayBounds>, String> {
    // Window enumeration and bounds retrieval is complex and platform-specific:
    // - macOS: CGWindowListCopyWindowInfo with filtering
    // - Windows: EnumWindows + GetWindowRect
    // - Linux: X11 XQueryTree or Wayland-specific protocol
    //
    // For MVP, we support full-screen sharing where overlay covers the whole screen
    // Window-specific tracking can be enhanced in a future iteration
    //
    // Return None to indicate window tracking is not yet implemented
    log::info!("Window bounds tracking not yet implemented");
    Ok(None)
}

/// Simple base64 encoding for the overlay HTML content
fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);

    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;

        result.push(CHARS[b0 >> 2] as char);
        result.push(CHARS[((b0 & 0x03) << 4) | (b1 >> 4)] as char);
        result.push(if chunk.len() > 1 {
            CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] as char
        } else {
            '='
        });
        result.push(if chunk.len() > 2 {
            CHARS[b2 & 0x3f] as char
        } else {
            '='
        });
    }

    result
}

/// Configure click-through behavior for the overlay window
/// Platform-specific implementation using native APIs
fn configure_click_through(window: &tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        configure_click_through_macos(window)?;
    }

    #[cfg(target_os = "windows")]
    {
        configure_click_through_windows(window)?;
    }

    #[cfg(target_os = "linux")]
    {
        configure_click_through_linux(window)?;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = window;
        log::warn!("Click-through not implemented for this platform");
    }

    Ok(())
}

/// macOS: Use NSWindow.setIgnoresMouseEvents to enable click-through
/// IMPORTANT: NSWindow operations must run on the main thread
#[cfg(target_os = "macos")]
fn configure_click_through_macos(window: &tauri::WebviewWindow) -> Result<(), String> {
    use objc::runtime::{Class, Object, YES, NO};
    use objc::{msg_send, sel, sel_impl};

    // Get the NSWindow pointer from the Tauri window
    let ns_window = window
        .ns_window()
        .map_err(|e| format!("Failed to get NSWindow: {}", e))?;

    let ns_window_ptr = ns_window as usize;

    // Configure NSWindow on main thread
    dispatch::Queue::main().exec_sync(move || {
        unsafe {
            let ns_window = ns_window_ptr as *mut Object;

            // Set ignoresMouseEvents to YES for click-through behavior
            let _: () = msg_send![ns_window, setIgnoresMouseEvents: YES];

            // Set window level high enough to appear above most windows
            let overlay_level: i64 = 6;
            let _: () = msg_send![ns_window, setLevel: overlay_level];

            // Remove shadow for cleaner overlay appearance
            let _: () = msg_send![ns_window, setHasShadow: NO];

            // Make window follow user across all Spaces (virtual desktops)
            let can_join_all_spaces: u64 = 1;
            let _: () = msg_send![ns_window, setCollectionBehavior: can_join_all_spaces];

            // Ensure NSWindow transparency
            let _: () = msg_send![ns_window, setOpaque: NO];

            // Set NSWindow background color to clear
            let ns_color_class = Class::get("NSColor").unwrap();
            let clear_color: *mut Object = msg_send![ns_color_class, clearColor];
            let _: () = msg_send![ns_window, setBackgroundColor: clear_color];
        }
    });

    log::info!("macOS: Configured overlay - click-through, level=6, joins all spaces, transparent");
    Ok(())
}

/// Windows: Use WS_EX_TRANSPARENT and WS_EX_LAYERED for click-through
#[cfg(target_os = "windows")]
fn configure_click_through_windows(window: &tauri::WebviewWindow) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT,
        WS_EX_TOPMOST,
    };

    let hwnd = window
        .hwnd()
        .map_err(|e| format!("Failed to get HWND: {}", e))?;

    let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);

    unsafe {
        // Get current extended style
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);

        // Add WS_EX_TRANSPARENT, WS_EX_LAYERED, and WS_EX_TOPMOST for click-through
        // WS_EX_TRANSPARENT: Makes the window transparent to mouse input
        // WS_EX_LAYERED: Required for transparency effects
        // WS_EX_TOPMOST: Keeps window on top
        let new_style = ex_style
            | WS_EX_TRANSPARENT.0 as isize
            | WS_EX_LAYERED.0 as isize
            | WS_EX_TOPMOST.0 as isize;

        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
    }

    log::info!("Windows: Configured click-through with WS_EX_TRANSPARENT | WS_EX_LAYERED");
    Ok(())
}

/// Linux: Basic transparency mode, full click-through varies by window manager
#[cfg(target_os = "linux")]
fn configure_click_through_linux(_window: &tauri::WebviewWindow) -> Result<(), String> {
    // Linux click-through is more complex and varies by window manager:
    // - X11: Would use XShapeCombineRectangles to set input shape to empty
    // - Wayland: Depends on compositor support for input regions
    //
    // For now, we rely on the transparent window + always_on_top settings
    // The overlay will be visible but may intercept mouse events on some systems
    //
    // Future enhancement: Add x11rb or wayland-client for proper input passthrough

    log::info!("Linux: Click-through configured (basic mode - may vary by window manager)");
    log::info!("Linux: For X11, full click-through would require XShape extension");
    Ok(())
}

// ============================================================================
// Screen Bounds Utility (used by multiple features)
// ============================================================================

/// Screen bounds info for position validation and window placement
#[derive(Debug, Clone, serde::Serialize)]
pub struct ScreenBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

/// Get all available screen bounds
/// Used for transform mode positioning and multi-monitor support
#[tauri::command]
pub async fn get_all_screen_bounds(app: AppHandle) -> Result<Vec<ScreenBounds>, String> {
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("Failed to get monitors: {}", e))?;

    let primary = app.primary_monitor().ok().flatten();
    let primary_position = primary.as_ref().map(|m| m.position());

    let bounds: Vec<ScreenBounds> = monitors
        .iter()
        .map(|m| {
            let pos = m.position();
            let size = m.size();
            let is_primary = primary_position
                .map(|pp| pp.x == pos.x && pp.y == pos.y)
                .unwrap_or(false);

            ScreenBounds {
                x: pos.x,
                y: pos.y,
                width: size.width,
                height: size.height,
                is_primary,
            }
        })
        .collect();

    Ok(bounds)
}

// ============================================================================
// Transform Mode Commands (Story 3.7 - ADR-009)
// ============================================================================

use std::sync::atomic::{AtomicBool, Ordering};

/// State to store the original window geometry before transform
pub struct TransformModeState {
    /// Original window width
    pub original_width: Mutex<Option<u32>>,
    /// Original window height
    pub original_height: Mutex<Option<u32>>,
    /// Original window X position
    pub original_x: Mutex<Option<i32>>,
    /// Original window Y position
    pub original_y: Mutex<Option<i32>>,
    /// Whether transform mode is active
    pub is_transformed: AtomicBool,
}

impl Default for TransformModeState {
    fn default() -> Self {
        Self {
            original_width: Mutex::new(None),
            original_height: Mutex::new(None),
            original_x: Mutex::new(None),
            original_y: Mutex::new(None),
            is_transformed: AtomicBool::new(false),
        }
    }
}

/// Control bar dimensions
const CONTROL_BAR_WIDTH: u32 = 450;
const CONTROL_BAR_HEIGHT: u32 = 80;

/// Configuration for saved control bar position
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct ControlBarPosition {
    pub x: i32,
    pub y: i32,
}

/// Transform the main window into a compact control bar
/// Saves original geometry, resizes, repositions to top-center, enables always-on-top
#[tauri::command]
pub async fn transform_to_control_bar(
    window: tauri::Window,
    app: AppHandle,
    state: State<'_, TransformModeState>,
    saved_position: Option<ControlBarPosition>,
) -> Result<(), String> {
    // Check if already transformed
    if state.is_transformed.load(Ordering::SeqCst) {
        return Err("Window is already in transform mode".to_string());
    }

    // Save current window geometry
    let current_size = window.outer_size().map_err(|e| e.to_string())?;
    let current_position = window.outer_position().map_err(|e| e.to_string())?;

    {
        let mut width = state.original_width.lock().map_err(|e| e.to_string())?;
        *width = Some(current_size.width);
    }
    {
        let mut height = state.original_height.lock().map_err(|e| e.to_string())?;
        *height = Some(current_size.height);
    }
    {
        let mut x = state.original_x.lock().map_err(|e| e.to_string())?;
        *x = Some(current_position.x);
    }
    {
        let mut y = state.original_y.lock().map_err(|e| e.to_string())?;
        *y = Some(current_position.y);
    }

    log::info!(
        "Saving original window geometry: {}x{} at ({}, {})",
        current_size.width, current_size.height,
        current_position.x, current_position.y
    );

    // Calculate new position
    let (new_x, new_y) = if let Some(pos) = saved_position {
        // Validate saved position is still on screen
        let screens = get_all_screen_bounds(app.clone()).await?;
        let is_valid = screens.iter().any(|screen| {
            let bar_right = pos.x + CONTROL_BAR_WIDTH as i32;
            let bar_bottom = pos.y + CONTROL_BAR_HEIGHT as i32;
            let screen_right = screen.x + screen.width as i32;
            let screen_bottom = screen.y + screen.height as i32;
            pos.x < screen_right && bar_right > screen.x &&
            pos.y < screen_bottom && bar_bottom > screen.y
        });

        if is_valid {
            (pos.x, pos.y)
        } else {
            // Fallback to default position
            calculate_default_position(&app)?
        }
    } else {
        calculate_default_position(&app)?
    };

    log::info!(
        "Transforming window to control bar: {}x{} at ({}, {})",
        CONTROL_BAR_WIDTH, CONTROL_BAR_HEIGHT, new_x, new_y
    );

    // Resize window to compact dimensions
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: CONTROL_BAR_WIDTH as f64,
            height: CONTROL_BAR_HEIGHT as f64,
        }))
        .map_err(|e| format!("Failed to set size: {}", e))?;

    // Reposition window
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: new_x,
            y: new_y,
        }))
        .map_err(|e| format!("Failed to set position: {}", e))?;

    // Enable always-on-top
    window
        .set_always_on_top(true)
        .map_err(|e| format!("Failed to set always on top: {}", e))?;

    // Enable content protection (exclude from screen capture)
    set_content_protection_internal(&window, true)?;

    // Mark as transformed
    state.is_transformed.store(true, Ordering::SeqCst);

    log::info!("Window transformed to control bar mode successfully");
    Ok(())
}

/// Restore the window from control bar mode to its original state
#[tauri::command]
pub async fn restore_from_control_bar(
    window: tauri::Window,
    state: State<'_, TransformModeState>,
) -> Result<(), String> {
    // Check if actually transformed
    if !state.is_transformed.load(Ordering::SeqCst) {
        return Err("Window is not in transform mode".to_string());
    }

    // Get saved geometry
    let width = {
        let w = state.original_width.lock().map_err(|e| e.to_string())?;
        w.ok_or_else(|| "No saved width".to_string())?
    };
    let height = {
        let h = state.original_height.lock().map_err(|e| e.to_string())?;
        h.ok_or_else(|| "No saved height".to_string())?
    };
    let x = {
        let x = state.original_x.lock().map_err(|e| e.to_string())?;
        x.ok_or_else(|| "No saved x position".to_string())?
    };
    let y = {
        let y = state.original_y.lock().map_err(|e| e.to_string())?;
        y.ok_or_else(|| "No saved y position".to_string())?
    };

    log::info!(
        "Restoring window to original geometry: {}x{} at ({}, {})",
        width, height, x, y
    );

    // Disable content protection first
    set_content_protection_internal(&window, false)?;

    // Disable always-on-top
    window
        .set_always_on_top(false)
        .map_err(|e| format!("Failed to disable always on top: {}", e))?;

    // Restore original size
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }))
        .map_err(|e| format!("Failed to restore size: {}", e))?;

    // Restore original position
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|e| format!("Failed to restore position: {}", e))?;

    // Clear saved geometry
    {
        let mut w = state.original_width.lock().map_err(|e| e.to_string())?;
        *w = None;
    }
    {
        let mut h = state.original_height.lock().map_err(|e| e.to_string())?;
        *h = None;
    }
    {
        let mut x = state.original_x.lock().map_err(|e| e.to_string())?;
        *x = None;
    }
    {
        let mut y = state.original_y.lock().map_err(|e| e.to_string())?;
        *y = None;
    }

    // Mark as not transformed
    state.is_transformed.store(false, Ordering::SeqCst);

    log::info!("Window restored from control bar mode successfully");
    Ok(())
}

/// Check if transform mode is active
#[tauri::command]
pub fn is_transform_mode_active(state: State<'_, TransformModeState>) -> bool {
    state.is_transformed.load(Ordering::SeqCst)
}

/// Calculate default position (top-center of primary screen)
fn calculate_default_position(app: &AppHandle) -> Result<(i32, i32), String> {
    let primary_monitor = app
        .primary_monitor()
        .map_err(|e| format!("Failed to get primary monitor: {}", e))?
        .ok_or_else(|| "No primary monitor found".to_string())?;

    let monitor_size = primary_monitor.size();
    let monitor_position = primary_monitor.position();

    let x = monitor_position.x + (monitor_size.width as i32 - CONTROL_BAR_WIDTH as i32) / 2;
    let y = monitor_position.y + 40; // 40px from top, below typical camera location

    Ok((x, y))
}

/// Internal function to set content protection (platform-specific)
fn set_content_protection_internal(window: &tauri::Window, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        set_content_protection_macos(window, enabled)?;
    }

    #[cfg(target_os = "windows")]
    {
        set_content_protection_windows(window, enabled)?;
    }

    #[cfg(target_os = "linux")]
    {
        // Linux doesn't have a standard API for this
        log::info!("Linux: Content protection not supported");
    }

    Ok(())
}

/// macOS: Set NSWindow.sharingType to exclude from screen capture
#[cfg(target_os = "macos")]
fn set_content_protection_macos(window: &tauri::Window, enabled: bool) -> Result<(), String> {
    use objc::runtime::Object;
    use objc::{msg_send, sel, sel_impl};

    let ns_window = window
        .ns_window()
        .map_err(|e| format!("Failed to get NSWindow: {}", e))?;

    let ns_window_ptr = ns_window as usize;

    // Configure NSWindow on main thread
    dispatch::Queue::main().exec_sync(move || {
        unsafe {
            let ns_window = ns_window_ptr as *mut Object;
            // NSWindowSharingNone = 0, NSWindowSharingReadOnly = 1
            let sharing_type: i64 = if enabled { 0 } else { 1 };
            let _: () = msg_send![ns_window, setSharingType: sharing_type];
        }
    });

    log::info!(
        "macOS: Content protection {} (sharingType = {})",
        if enabled { "enabled" } else { "disabled" },
        if enabled { "none" } else { "readOnly" }
    );
    Ok(())
}

/// Windows: Use SetWindowDisplayAffinity to exclude from screen capture
#[cfg(target_os = "windows")]
fn set_content_protection_windows(window: &tauri::Window, enabled: bool) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE,
    };

    let hwnd = window
        .hwnd()
        .map_err(|e| format!("Failed to get HWND: {}", e))?;

    let hwnd = HWND(hwnd.0 as *mut std::ffi::c_void);

    unsafe {
        let affinity = if enabled { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE };
        SetWindowDisplayAffinity(hwnd, affinity)
            .map_err(|e| format!("Failed to set display affinity: {}", e))?;
    }

    log::info!(
        "Windows: Content protection {} (WDA_{})",
        if enabled { "enabled" } else { "disabled" },
        if enabled { "EXCLUDEFROMCAPTURE" } else { "NONE" }
    );
    Ok(())
}
