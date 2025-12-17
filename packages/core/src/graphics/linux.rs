//! Linux-specific overlay window configuration
//!
//! Linux overlay support varies by display server:
//! - X11: Can use EWMH hints for click-through and always-on-top
//! - Wayland: More restricted, compositor-dependent
//!
//! For MVP, we rely on winit's cross-platform APIs.
//! Full Linux overlay support may require platform-specific work.

use super::OverlayResult;
use std::sync::Arc;
use winit::window::Window;

/// Configure Linux-specific window properties for overlay
pub fn configure_overlay_window(_window: &Window) -> OverlayResult<()> {
    // winit handles basic transparency and always-on-top
    // Click-through is handled by set_cursor_hittest(false) in mod.rs
    //
    // For full X11 support, we could use:
    // - _NET_WM_WINDOW_TYPE_UTILITY or _NET_WM_WINDOW_TYPE_DOCK
    // - XShapeCombineRegion for input shape (click-through)
    //
    // For Wayland:
    // - layer-shell protocol for overlay windows
    // - Input region manipulation
    //
    // These require additional dependencies and are deferred to future work.

    tracing::debug!("Linux overlay configured (basic mode)");
    Ok(())
}

/// Create wgpu surface for Linux (standard surface creation)
pub fn create_surface<'a>(
    instance: &wgpu::Instance,
    window: Arc<Window>,
) -> OverlayResult<wgpu::Surface<'a>> {
    use super::OverlayError;

    instance.create_surface(window).map_err(|e| {
        tracing::error!("Failed to create surface: {}", e);
        OverlayError::SurfaceCreationError
    })
}
