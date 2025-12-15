//! Cross-platform permissions checking module.
//!
//! Provides a unified interface for checking system permissions across platforms.
//! Uses conditional compilation to load platform-specific implementations.
//!
//! # Platform Support
//!
//! - **macOS**: Uses Core Graphics for screen recording, AVFoundation for camera/mic
//! - **Linux**: Uses Wayland/X11 detection (permissions vary by desktop environment)
//! - **Windows**: Returns `true` (permissions handled at OS level during first use)

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::*;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;

// Fallback for other platforms
#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
mod default;
#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
pub use default::*;

/// Permission status for a specific capability
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionStatus {
    /// Permission is granted
    Granted,
    /// Permission is denied
    Denied,
    /// Permission has not been requested yet
    NotDetermined,
    /// Permission is restricted (e.g., parental controls)
    Restricted,
    /// Not applicable for this platform
    NotApplicable,
}

/// All permission statuses for the application
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PermissionState {
    pub screen_recording: PermissionStatus,
    pub microphone: PermissionStatus,
    pub camera: PermissionStatus,
    pub accessibility: PermissionStatus,
}

impl Default for PermissionState {
    fn default() -> Self {
        Self {
            screen_recording: PermissionStatus::NotDetermined,
            microphone: PermissionStatus::NotDetermined,
            camera: PermissionStatus::NotDetermined,
            accessibility: PermissionStatus::NotDetermined,
        }
    }
}
