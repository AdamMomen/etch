//! Default/fallback permission handling for unsupported platforms.

use super::{PermissionState, PermissionStatus};

/// Check screen recording permission - returns NotApplicable for unsupported platforms.
pub fn check_screen_recording() -> PermissionStatus {
    tracing::warn!("Permission check on unsupported platform");
    PermissionStatus::NotApplicable
}

/// Request screen recording permission - no-op for unsupported platforms.
pub fn request_screen_recording() -> PermissionStatus {
    PermissionStatus::NotApplicable
}

/// Get current permission state.
pub fn get_permission_state() -> PermissionState {
    PermissionState::default()
}

/// Check if screen sharing is possible.
pub fn has_screen_share_permission() -> bool {
    false
}
