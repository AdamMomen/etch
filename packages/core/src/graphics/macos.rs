//! macOS-specific overlay window configuration
//!
//! Configures NSWindow properties for transparent, click-through overlay.

use super::OverlayResult;
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use winit::window::Window;

/// Configure macOS-specific window properties for overlay
pub fn configure_overlay_window(window: &Window) -> OverlayResult<()> {
    use super::OverlayError;
    use objc2::rc::Retained;
    use objc2_app_kit::{NSFloatingWindowLevel, NSView};

    // Get the NSWindow handle
    let handle = window
        .window_handle()
        .map_err(|_| OverlayError::ClickThroughError)?;

    if let RawWindowHandle::AppKit(handle) = handle.as_raw() {
        unsafe {
            let ns_view: *mut NSView = handle.ns_view.as_ptr().cast();
            let ns_view: Option<Retained<NSView>> = Retained::retain(ns_view);

            if let Some(ns_view) = ns_view {
                if let Some(ns_window) = ns_view.window() {
                    // Set window level above normal windows (floating + 1)
                    ns_window.setLevel(NSFloatingWindowLevel + 1);

                    // Ignore mouse events (click-through)
                    ns_window.setIgnoresMouseEvents(true);

                    // No shadow for clean overlay appearance
                    ns_window.setHasShadow(false);

                    tracing::debug!(
                        "macOS overlay configured: level={}, ignoresMouseEvents=true",
                        NSFloatingWindowLevel + 1
                    );
                }
            }
        }
    }

    Ok(())
}

/// Create wgpu surface for macOS (standard surface creation)
pub fn create_surface<'a>(
    instance: &wgpu::Instance,
    window: std::sync::Arc<Window>,
) -> OverlayResult<wgpu::Surface<'a>> {
    use super::OverlayError;

    instance.create_surface(window).map_err(|e| {
        tracing::error!("Failed to create surface: {}", e);
        OverlayError::SurfaceCreationError
    })
}
