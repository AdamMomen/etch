//! Linux-specific permission handling.
//!
//! On Linux, screen capture permissions vary by display server:
//! - X11: Generally no explicit permission required
//! - Wayland: Requires portal-based permission (handled by DesktopCapturer)
//!
//! We detect the display server and return appropriate status.

use super::{PermissionState, PermissionStatus};

/// Detect if running on Wayland display server.
fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok() || std::env::var("XDG_SESSION_TYPE")
        .map(|v| v.to_lowercase() == "wayland")
        .unwrap_or(false)
}

/// Detect if running on X11 display server.
fn is_x11() -> bool {
    std::env::var("DISPLAY").is_ok() && !is_wayland()
}

/// Check screen recording permission on Linux.
///
/// On X11, this is generally always allowed.
/// On Wayland, permission is requested per-capture via xdg-desktop-portal.
pub fn check_screen_recording() -> PermissionStatus {
    tracing::debug!("Checking Linux screen recording permission");

    if is_wayland() {
        // Wayland uses portal-based permission per capture session
        // The actual permission is requested when capture starts
        tracing::debug!("Wayland detected - permission requested per capture");
        PermissionStatus::NotDetermined
    } else if is_x11() {
        // X11 generally allows screen capture without explicit permission
        tracing::debug!("X11 detected - screen capture allowed");
        PermissionStatus::Granted
    } else {
        tracing::warn!("Unknown display server");
        PermissionStatus::NotDetermined
    }
}

/// Request screen recording permission on Linux.
///
/// On Wayland, this is a no-op as permission is requested during capture.
/// Returns current status.
pub fn request_screen_recording() -> PermissionStatus {
    tracing::info!("Screen recording permission requested on Linux");

    if is_wayland() {
        // Portal will prompt when capture starts
        PermissionStatus::NotDetermined
    } else {
        PermissionStatus::Granted
    }
}

/// Get current permission state.
pub fn get_permission_state() -> PermissionState {
    PermissionState {
        screen_recording: check_screen_recording(),
        microphone: PermissionStatus::NotApplicable,
        camera: PermissionStatus::NotApplicable,
        accessibility: PermissionStatus::NotApplicable,
    }
}

/// Check if screen sharing is possible.
///
/// On X11 this is always true. On Wayland, the portal will handle it.
pub fn has_screen_share_permission() -> bool {
    let status = check_screen_recording();
    // On Wayland, NotDetermined means "will be prompted", which is acceptable
    matches!(status, PermissionStatus::Granted | PermissionStatus::NotDetermined)
}
