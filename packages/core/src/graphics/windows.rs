//! Windows-specific overlay window configuration
//!
//! Uses DirectComposition for proper transparent overlay rendering.
//! DirectComposition is required on Windows to render transparent
//! overlay windows with hardware acceleration.

use super::{OverlayError, OverlayResult};
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use std::sync::Arc;
use windows::core::*;
use windows::Win32::{
    Foundation::HWND,
    Graphics::{
        Direct2D::D2D1CreateDevice,
        Direct3D::D3D_DRIVER_TYPE_HARDWARE,
        Direct3D11::{D3D11CreateDevice, D3D11_CREATE_DEVICE_BGRA_SUPPORT, D3D11_SDK_VERSION},
        DirectComposition::{
            DCompositionCreateDevice2, IDCompositionDesktopDevice, IDCompositionTarget,
        },
        Dxgi::IDXGIDevice3,
    },
};
use winit::window::Window;

/// Configure Windows-specific window properties for overlay
pub fn configure_overlay_window(window: &Window) -> OverlayResult<()> {
    // Skip taskbar - overlay shouldn't appear in taskbar
    window.set_skip_taskbar(true);

    tracing::debug!("Windows overlay configured: skip_taskbar=true");
    Ok(())
}

/// DirectComposition context for Windows transparent rendering
///
/// Windows requires DirectComposition to properly render transparent
/// overlay windows. This struct manages the composition visual tree
/// needed for wgpu to render with alpha blending.
#[derive(Debug)]
pub struct DirectComposition {
    target: IDCompositionTarget,
    desktop: IDCompositionDesktopDevice,
}

impl DirectComposition {
    /// Create a new DirectComposition context for the given window
    pub fn new(window: Arc<Window>) -> Option<Self> {
        let window_handle = window.window_handle();
        let raw_handle = match window_handle {
            Ok(handle) => match handle.as_raw() {
                RawWindowHandle::Win32(handle) => handle,
                _ => {
                    tracing::error!("Failed to get raw win32 window handle");
                    return None;
                }
            },
            _ => {
                tracing::error!("Failed to get raw window handle");
                return None;
            }
        };

        let (target, desktop) = unsafe {
            // Create D3D11 device with BGRA support for composition
            let mut device = None;
            let _ = D3D11CreateDevice(
                None,
                D3D_DRIVER_TYPE_HARDWARE,
                None,
                D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                None,
                D3D11_SDK_VERSION,
                Some(&mut device),
                None,
                None,
            );

            let device = device?;

            // Cast to DXGI device for D2D interop
            let dxgi: IDXGIDevice3 = device.cast().ok()?;

            // Create D2D device
            let device_2d = D2D1CreateDevice(&dxgi, None).ok()?;

            // Create composition desktop device
            let desktop: IDCompositionDesktopDevice = DCompositionCreateDevice2(&device_2d).ok()?;

            // Create target for the window
            let hwnd = HWND(raw_handle.hwnd.get() as *mut std::ffi::c_void);
            let target = desktop.CreateTargetForHwnd(hwnd, true).ok()?;

            (target, desktop)
        };

        tracing::info!("DirectComposition context created");
        Some(Self { target, desktop })
    }

    /// Create a wgpu surface using DirectComposition visual
    pub fn create_surface<'a>(
        &self,
        instance: &wgpu::Instance,
    ) -> OverlayResult<wgpu::Surface<'a>> {
        let surface_visual = unsafe {
            // Create root visual
            let visual = self.desktop.CreateVisual().map_err(|e| {
                tracing::error!("Failed to create visual: {:?}", e);
                OverlayError::SurfaceCreationError
            })?;

            // Set as root of composition tree
            self.target.SetRoot(&visual).map_err(|e| {
                tracing::error!("Failed to set root visual: {:?}", e);
                OverlayError::SurfaceCreationError
            })?;

            // Create surface visual for wgpu rendering
            let surface_visual = self.desktop.CreateVisual().map_err(|e| {
                tracing::error!("Failed to create surface visual: {:?}", e);
                OverlayError::SurfaceCreationError
            })?;

            // Add to visual tree
            visual
                .AddVisual(&surface_visual, true, None)
                .map_err(|e| {
                    tracing::error!("Failed to add visual: {:?}", e);
                    OverlayError::SurfaceCreationError
                })?;

            surface_visual
        };

        // Create wgpu surface from composition visual
        unsafe {
            instance
                .create_surface_unsafe(wgpu::SurfaceTargetUnsafe::CompositionVisual(
                    surface_visual.as_raw(),
                ))
                .map_err(|e| {
                    tracing::error!("Failed to create surface: {:?}", e);
                    OverlayError::SurfaceCreationError
                })
        }
    }

    /// Commit pending composition changes to make them visible
    pub fn commit(&self) -> OverlayResult<()> {
        unsafe {
            self.desktop.Commit().map_err(|e| {
                tracing::error!("Failed to commit: {:?}", e);
                OverlayError::SurfaceCreationError
            })
        }
    }
}

impl Drop for DirectComposition {
    fn drop(&mut self) {
        unsafe {
            let _ = self.target.SetRoot(None);
            let _ = self.desktop.Commit();
        }
        tracing::debug!("DirectComposition context dropped");
    }
}

/// Create wgpu surface for Windows using DirectComposition
pub fn create_surface<'a>(
    instance: &wgpu::Instance,
    window: Arc<Window>,
) -> OverlayResult<(wgpu::Surface<'a>, Option<DirectComposition>)> {
    let dc =
        DirectComposition::new(window.clone()).ok_or(OverlayError::SurfaceCreationError)?;
    let surface = dc.create_surface(instance)?;
    Ok((surface, Some(dc)))
}
