//! macOS-specific permission handling.
//!
//! Uses Core Graphics for screen recording permission checks.

use core_graphics::access::ScreenCaptureAccess;

use super::{PermissionState, PermissionStatus};

/// Check if screen recording permission is granted on macOS.
///
/// Uses `CGPreflightScreenCaptureAccess()` which returns true if permission
/// is already granted, false otherwise. Does NOT prompt the user.
pub fn check_screen_recording() -> PermissionStatus {
    tracing::debug!("Checking macOS screen recording permission");
    let access = ScreenCaptureAccess;
    if access.preflight() {
        PermissionStatus::Granted
    } else {
        PermissionStatus::Denied
    }
}

/// Request screen recording permission on macOS.
///
/// Uses `CGRequestScreenCaptureAccess()` which prompts the user if permission
/// hasn't been determined yet. Returns immediately with the current status.
///
/// Note: On macOS 10.15+, the user must manually enable in System Preferences
/// after the initial prompt. The function returns the current status, not
/// the result of the user's choice (which happens asynchronously).
pub fn request_screen_recording() -> PermissionStatus {
    tracing::info!("Requesting macOS screen recording permission");
    let access = ScreenCaptureAccess;

    // This will prompt the user if not determined
    let granted = access.request();

    if granted {
        PermissionStatus::Granted
    } else {
        // Could be denied or not yet determined (prompt shown)
        PermissionStatus::Denied
    }
}

/// Check all permissions and return the current state.
pub fn get_permission_state() -> PermissionState {
    PermissionState {
        screen_recording: check_screen_recording(),
        // Camera and microphone are handled by LiveKit/AVFoundation at connection time
        microphone: PermissionStatus::NotApplicable,
        camera: PermissionStatus::NotApplicable,
        // Accessibility is only needed for remote control (future feature)
        accessibility: PermissionStatus::NotApplicable,
    }
}

/// Check if all required permissions are granted for screen sharing.
pub fn has_screen_share_permission() -> bool {
    check_screen_recording() == PermissionStatus::Granted
}
