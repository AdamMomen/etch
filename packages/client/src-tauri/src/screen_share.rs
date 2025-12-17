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
