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
use wgpu::util::DeviceExt;
use winit::dpi::{LogicalSize, PhysicalPosition};
use winit::window::{Window, WindowAttributes, WindowLevel};

/// Vertex data for colored geometry rendering
#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct ColoredVertex {
    /// Position in clip space (-1 to 1)
    pub position: [f32; 2],
    /// RGBA color (0 to 1)
    pub color: [f32; 4],
}

impl ColoredVertex {
    /// Vertex buffer layout for the shader
    pub fn desc() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<ColoredVertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                // position
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x2,
                },
                // color
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 2]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x4,
                },
            ],
        }
    }
}

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

    // Render pipeline for colored geometry
    render_pipeline: wgpu::RenderPipeline,

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

        // Create shader module from embedded WGSL
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("overlay_shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });

        // Create render pipeline for colored geometry
        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("overlay_pipeline_layout"),
                bind_group_layouts: &[],
                push_constant_ranges: &[],
            });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("overlay_render_pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                buffers: &[ColoredVertex::desc()],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: surface_format,
                    blend: Some(wgpu::BlendState {
                        color: wgpu::BlendComponent {
                            src_factor: wgpu::BlendFactor::One,
                            dst_factor: wgpu::BlendFactor::OneMinusSrcAlpha,
                            operation: wgpu::BlendOperation::Add,
                        },
                        alpha: wgpu::BlendComponent {
                            src_factor: wgpu::BlendFactor::One,
                            dst_factor: wgpu::BlendFactor::OneMinusSrcAlpha,
                            operation: wgpu::BlendOperation::Add,
                        },
                    }),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None, // No culling for 2D
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        tracing::info!("Graphics context created: {}x{}", size.width, size.height);

        Ok(Self {
            surface,
            device,
            queue,
            config,
            window,
            render_pipeline,
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

    /// Render a frame - clears to transparent
    pub fn render(&self) -> Result<(), wgpu::SurfaceError> {
        self.render_with_vertices(&[])
    }

    /// Render a frame with vertices
    pub fn render_with_vertices(&self, vertices: &[ColoredVertex]) -> Result<(), wgpu::SurfaceError> {
        let output = self.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("overlay_encoder"),
            });

        // Create vertex buffer if we have vertices
        let vertex_buffer = if !vertices.is_empty() {
            Some(
                self.device
                    .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                        label: Some("vertex_buffer"),
                        contents: bytemuck::cast_slice(vertices),
                        usage: wgpu::BufferUsages::VERTEX,
                    }),
            )
        } else {
            None
        };

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("overlay_pass"),
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

            // Draw vertices if we have any
            if let Some(ref buffer) = vertex_buffer {
                render_pass.set_pipeline(&self.render_pipeline);
                render_pass.set_vertex_buffer(0, buffer.slice(..));
                render_pass.draw(0..vertices.len() as u32, 0..1);
            }
        }

        self.queue.submit(std::iter::once(encoder.finish()));
        self.window.pre_present_notify();
        output.present();

        Ok(())
    }

    /// Render a test rectangle at the center of the screen
    /// This is for spike validation - proves the wgpu pipeline works
    pub fn render_test_rectangle(&self) -> Result<(), wgpu::SurfaceError> {
        // Create a semi-transparent red rectangle in the center
        // Coordinates are in clip space: -1.0 to 1.0
        let color = [1.0, 0.2, 0.2, 0.7]; // Semi-transparent red

        // Rectangle corners (center of screen, 40% width/height)
        let vertices = [
            // Triangle 1
            ColoredVertex { position: [-0.2, -0.2], color },
            ColoredVertex { position: [0.2, -0.2], color },
            ColoredVertex { position: [0.2, 0.2], color },
            // Triangle 2
            ColoredVertex { position: [-0.2, -0.2], color },
            ColoredVertex { position: [0.2, 0.2], color },
            ColoredVertex { position: [-0.2, 0.2], color },
        ];

        self.render_with_vertices(&vertices)
    }

    /// Render a rectangle at specific pixel coordinates
    /// x, y are top-left corner in pixels; width, height in pixels
    pub fn render_rectangle(
        &self,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
        color: [f32; 4],
    ) -> Result<(), wgpu::SurfaceError> {
        // Convert pixel coordinates to clip space (-1 to 1)
        let surface_width = self.config.width as f32;
        let surface_height = self.config.height as f32;

        // Convert to normalized device coordinates
        let x0 = (x / surface_width) * 2.0 - 1.0;
        let y0 = 1.0 - (y / surface_height) * 2.0; // Flip Y (screen coords are top-down)
        let x1 = ((x + width) / surface_width) * 2.0 - 1.0;
        let y1 = 1.0 - ((y + height) / surface_height) * 2.0;

        let vertices = [
            // Triangle 1 (top-left, bottom-left, bottom-right)
            ColoredVertex { position: [x0, y0], color },
            ColoredVertex { position: [x0, y1], color },
            ColoredVertex { position: [x1, y1], color },
            // Triangle 2 (top-left, bottom-right, top-right)
            ColoredVertex { position: [x0, y0], color },
            ColoredVertex { position: [x1, y1], color },
            ColoredVertex { position: [x1, y0], color },
        ];

        self.render_with_vertices(&vertices)
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

        // For now, render a test rectangle to validate the pipeline
        if let Err(e) = self.render_test_rectangle() {
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
