//! Graphics module for wgpu-based overlay rendering
//!
//! Handles the transparent overlay window where annotations and
//! remote cursors are rendered on top of the shared screen.
//!
//! Architecture based on hopp's patterns:
//! - winit for native window management
//! - wgpu for GPU-accelerated rendering
//! - Platform-specific transparency handling

use std::sync::Arc;
use winit::dpi::{LogicalSize, PhysicalPosition};
use winit::window::{Window, WindowAttributes, WindowLevel};

// Platform-specific modules
#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
mod linux;

/// Errors that can occur during overlay graphics operations
#[derive(thiserror::Error, Debug)]
pub enum OverlayError {
    #[error("Failed to create overlay window")]
    WindowCreationError,

    #[error("Failed to create graphics surface")]
    SurfaceCreationError,

    #[error("Failed to request graphics adapter")]
    AdapterRequestError,

    #[error("Failed to request graphics device")]
    DeviceRequestError,

    #[error("Failed to configure click-through")]
    ClickThroughError,
}

/// Result type for overlay operations
pub type OverlayResult<T = ()> = std::result::Result<T, OverlayError>;

/// Window attributes for the transparent overlay
pub fn get_overlay_window_attributes() -> WindowAttributes {
    WindowAttributes::default()
        .with_title("NAMELESS Annotation Overlay")
        .with_window_level(WindowLevel::AlwaysOnTop)
        .with_decorations(false)
        .with_transparent(true)
        .with_inner_size(LogicalSize::new(1.0, 1.0)) // Start small, resize later
        .with_visible(false) // Hidden until positioned
}

/// Transparent overlay window for rendering annotations
pub struct OverlayWindow {
    window: Arc<Window>,
    visible: bool,
}

impl OverlayWindow {
    /// Create a new overlay window
    pub fn new(event_loop: &winit::event_loop::ActiveEventLoop) -> OverlayResult<Self> {
        let attributes = get_overlay_window_attributes();

        let window = event_loop.create_window(attributes).map_err(|e| {
            tracing::error!("Failed to create overlay window: {}", e);
            OverlayError::WindowCreationError
        })?;

        // Enable click-through (mouse events pass to windows below)
        // This is the primary cross-platform mechanism
        window.set_cursor_hittest(false).map_err(|e| {
            tracing::error!("Failed to set cursor hittest: {}", e);
            OverlayError::ClickThroughError
        })?;

        // Platform-specific configuration
        #[cfg(target_os = "macos")]
        macos::configure_overlay_window(&window)?;

        #[cfg(target_os = "windows")]
        windows::configure_overlay_window(&window)?;

        #[cfg(target_os = "linux")]
        linux::configure_overlay_window(&window)?;

        let window = Arc::new(window);

        tracing::info!("Overlay window created successfully");

        Ok(Self {
            window,
            visible: false,
        })
    }

    /// Get reference to the underlying window
    pub fn window(&self) -> &Arc<Window> {
        &self.window
    }

    /// Request a redraw
    pub fn request_redraw(&self) {
        self.window.request_redraw();
    }

    /// Set window visibility
    pub fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
        self.window.set_visible(visible);
        tracing::debug!("Overlay visibility: {}", visible);
    }

    /// Set window bounds to match shared screen
    pub fn set_bounds(&self, x: i32, y: i32, width: u32, height: u32) {
        use winit::dpi::PhysicalSize;

        self.window.set_outer_position(PhysicalPosition::new(x, y));
        let _ = self
            .window
            .request_inner_size(PhysicalSize::new(width, height));

        tracing::debug!("Overlay bounds: {}x{} at ({}, {})", width, height, x, y);
    }

    /// Check if window is visible
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Get window ID for event matching
    pub fn id(&self) -> winit::window::WindowId {
        self.window.id()
    }
}

/// wgpu graphics context for overlay rendering
pub struct GraphicsContext {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    window: Arc<Window>,

    // Windows requires DirectComposition for transparent overlays
    #[cfg(target_os = "windows")]
    _direct_composition: Option<windows::DirectComposition>,
}

impl GraphicsContext {
    /// Create a new graphics context for the overlay window
    pub fn new(overlay: &OverlayWindow) -> OverlayResult<Self> {
        let window = overlay.window().clone();
        let size = window.inner_size();

        // Create wgpu instance
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        // Create surface (platform-specific)
        #[cfg(target_os = "windows")]
        let (surface, direct_composition) = windows::create_surface(&instance, window.clone())?;

        #[cfg(target_os = "macos")]
        let surface = macos::create_surface(&instance, window.clone())?;

        #[cfg(target_os = "linux")]
        let surface = linux::create_surface(&instance, window.clone())?;

        // Request adapter
        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: Some(&surface),
            force_fallback_adapter: false,
        }))
        .ok_or_else(|| {
            tracing::error!("Failed to find suitable GPU adapter");
            OverlayError::AdapterRequestError
        })?;

        tracing::info!("Using GPU adapter: {:?}", adapter.get_info().name);

        // Request device
        let (device, queue) = pollster::block_on(adapter.request_device(
            &wgpu::DeviceDescriptor {
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::default(),
                label: Some("overlay_device"),
                memory_hints: wgpu::MemoryHints::default(),
            },
            None, // trace path
        ))
        .map_err(|e| {
            tracing::error!("Failed to create device: {}", e);
            OverlayError::DeviceRequestError
        })?;

        // Configure surface
        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps.formats[0];

        // Find alpha mode that supports transparency
        let alpha_mode = surface_caps
            .alpha_modes
            .iter()
            .find(|mode| {
                matches!(
                    mode,
                    wgpu::CompositeAlphaMode::PreMultiplied
                        | wgpu::CompositeAlphaMode::PostMultiplied
                )
            })
            .copied()
            .unwrap_or(surface_caps.alpha_modes[0]);

        tracing::debug!(
            "Surface format: {:?}, alpha mode: {:?}",
            surface_format,
            alpha_mode
        );

        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.width.max(1),
            height: size.height.max(1),
            present_mode: wgpu::PresentMode::AutoVsync,
            alpha_mode,
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        surface.configure(&device, &config);

        // Commit DirectComposition on Windows
        #[cfg(target_os = "windows")]
        if let Some(ref dc) = direct_composition {
            dc.commit()?;
        }

        tracing::info!("Graphics context created: {}x{}", size.width, size.height);

        Ok(Self {
            surface,
            device,
            queue,
            config,
            window,
            #[cfg(target_os = "windows")]
            _direct_composition: direct_composition,
        })
    }

    /// Resize the surface when window size changes
    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.config.width = width;
            self.config.height = height;
            self.surface.configure(&self.device, &self.config);
            tracing::debug!("Surface resized to {}x{}", width, height);
        }
    }

    /// Render a frame - clears to transparent for now
    pub fn render(&self) -> Result<(), wgpu::SurfaceError> {
        let output = self.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("overlay_encoder"),
            });

        // Clear to fully transparent
        {
            let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("clear_pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.0,
                            g: 0.0,
                            b: 0.0,
                            a: 0.0, // Fully transparent
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
            });

            // TODO: Render annotations and cursors here
        }

        self.queue.submit(std::iter::once(encoder.finish()));
        self.window.pre_present_notify();
        output.present();

        Ok(())
    }

    /// Render annotations and cursors
    pub fn render_annotations(
        &self,
        _strokes: &[crate::annotation::Stroke],
        _cursors: &[crate::RemoteCursor],
    ) {
        // TODO: Implement stroke and cursor rendering
        // This will require:
        // 1. Vertex/fragment shaders for strokes
        // 2. Texture rendering for cursors
        // 3. Proper blending for transparency

        if let Err(e) = self.render() {
            tracing::error!("Render failed: {:?}", e);
        }
    }

    /// Get the wgpu device
    pub fn device(&self) -> &wgpu::Device {
        &self.device
    }

    /// Get the wgpu queue
    pub fn queue(&self) -> &wgpu::Queue {
        &self.queue
    }
}

impl Drop for GraphicsContext {
    fn drop(&mut self) {
        // Minimize window to prevent visual artifacts on Windows
        self.window.set_minimized(true);
    }
}
