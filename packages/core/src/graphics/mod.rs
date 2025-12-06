//! Graphics module for wgpu-based overlay rendering
//!
//! Handles the transparent overlay window where annotations and
//! remote cursors are rendered on top of the shared screen.

/// wgpu graphics context for overlay rendering
pub struct GraphicsContext {
    // TODO: Add wgpu resources when implementing
    // device: wgpu::Device,
    // queue: wgpu::Queue,
    // surface: wgpu::Surface,
    // pipeline: wgpu::RenderPipeline,
}

impl GraphicsContext {
    /// Create a new graphics context
    pub fn new() -> anyhow::Result<Self> {
        // TODO: Initialize wgpu
        // 1. Create instance
        // 2. Create adapter
        // 3. Create device and queue
        // 4. Create render pipeline for strokes and cursors

        tracing::info!("Graphics context created (stub)");
        Ok(Self {})
    }

    /// Render annotations and cursors to the overlay
    pub fn render(
        &self,
        _strokes: &[crate::annotation::Stroke],
        _cursors: &[crate::RemoteCursor],
    ) {
        // TODO: Implement rendering
        // 1. Clear surface
        // 2. Render each stroke
        // 3. Render each cursor
        // 4. Present
    }
}

impl Default for GraphicsContext {
    fn default() -> Self {
        Self::new().expect("Failed to create graphics context")
    }
}

/// Transparent overlay window
pub struct OverlayWindow {
    // TODO: Add winit window when implementing
    // window: winit::window::Window,
    visible: bool,
}

impl OverlayWindow {
    /// Create a new overlay window
    pub fn new(_event_loop: &winit::event_loop::ActiveEventLoop) -> anyhow::Result<Self> {
        // TODO: Create transparent, click-through window
        // let window = event_loop.create_window(
        //     WindowAttributes::default()
        //         .with_transparent(true)
        //         .with_decorations(false)
        // )?;

        tracing::info!("Overlay window created (stub)");
        Ok(Self { visible: false })
    }

    /// Request a redraw
    pub fn request_redraw(&self) {
        // TODO: window.request_redraw()
    }

    /// Set window visibility
    pub fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
        // TODO: window.set_visible(visible)
    }

    /// Set window bounds to match shared screen
    pub fn set_bounds(&self, _x: i32, _y: i32, _width: u32, _height: u32) {
        // TODO: window.set_outer_position() and set_inner_size()
    }

    /// Check if window is visible
    pub fn is_visible(&self) -> bool {
        self.visible
    }
}

// Windows DirectComposition will be added when implementing overlay
// #[cfg(target_os = "windows")]
// pub mod direct_composition;
