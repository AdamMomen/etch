/// Screen share related Tauri commands
/// Provides platform detection, window management, and Core process management
///
/// Uses Tauri's sidecar mechanism so Core inherits screen recording permission
/// from the parent NAMELESS app.

use std::io::{BufRead, BufReader, Write};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
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
                    log::debug!("Core stdout: {}", line_str);
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
