//! Windows-specific permission handling.
//!
//! On Windows, screen capture does not require explicit permission.
//! The OS handles this at the API level and will prompt users as needed.

use super::{PermissionState, PermissionStatus};

/// Check screen recording permission on Windows.
///
/// Windows does not have a dedicated screen recording permission system.
/// Access is granted by default.
pub fn check_screen_recording() -> PermissionStatus {
    tracing::debug!("Windows screen capture - no explicit permission needed");
    PermissionStatus::Granted
}

/// Request screen recording permission on Windows.
///
/// No-op as Windows doesn't require explicit permission.
pub fn request_screen_recording() -> PermissionStatus {
    PermissionStatus::Granted
}

/// Get current permission state.
pub fn get_permission_state() -> PermissionState {
    PermissionState {
        screen_recording: PermissionStatus::Granted,
        microphone: PermissionStatus::NotApplicable,
        camera: PermissionStatus::NotApplicable,
        accessibility: PermissionStatus::NotApplicable,
    }
}

/// Check if screen sharing is possible.
pub fn has_screen_share_permission() -> bool {
    true
}
