# Spike: wgpu Overlay Architecture in Core

Status: ready-for-testing

## Objective

Validate that we can render a transparent, click-through overlay window using winit + wgpu in the existing Core sidecar, following hopp's proven architecture for maximum performance.

## Background

Story 3.6 implemented overlay infrastructure using Tauri WebviewWindow. After reviewing hopp's implementation, we've decided to adopt their native rendering approach for better performance:

- **hopp approach**: winit + wgpu + DirectComposition (Windows)
- **Benefits**: Sub-millisecond render latency, lower memory, native compositor integration
- **Trade-off**: More complex implementation, custom shaders for annotations

## Spike Goals

1. **Create transparent overlay window** in Core using winit
2. **Verify click-through** works on macOS (primary dev platform)
3. **Render basic graphics** with wgpu (solid color, then simple shape)
4. **Establish communication** between Tauri app and Core for overlay commands
5. **Document architecture** for Epic 4 annotation rendering

## Success Criteria

- [x] Overlay window appears above shared content
- [x] Overlay is fully transparent (no background)
- [x] Clicks pass through to underlying windows (`set_cursor_hittest(false)`)
- [x] Can render a simple shape (rectangle/circle) via wgpu
- [x] Tauri can send "show overlay" / "hide overlay" commands to Core
- [ ] Works on macOS; Windows validation documented as follow-up

## Technical Exploration Areas

### 1. Window Creation (winit)

Based on hopp's `lib.rs:97-108`:

```rust
pub fn get_window_attributes() -> WindowAttributes {
    WindowAttributes::default()
        .with_title("Annotation Overlay")
        .with_window_level(WindowLevel::AlwaysOnTop)
        .with_decorations(false)
        .with_transparent(true)
        .with_content_protected(true)
}
```

Key APIs:
- `set_cursor_hittest(false)` for click-through
- `set_visible(true/false)` for show/hide
- Platform-specific: `set_has_shadow(false)` on macOS

### 2. Graphics Pipeline (wgpu)

Based on hopp's `graphics_context.rs`:

```rust
// Surface with alpha blending
let surface_config = wgpu::SurfaceConfiguration {
    alpha_mode: wgpu::CompositeAlphaMode::PreMultiplied,
    // ...
};

// Clear to transparent
wgpu::LoadOp::Clear(wgpu::Color { r: 0.0, g: 0.0, b: 0.0, a: 0.0 })
```

For annotations, we'll need:
- Vertex/fragment shaders for stroke rendering
- Texture support for cursors/icons
- Anti-aliased line rendering (consider lyon crate)

### 3. Windows Transparency (DirectComposition)

Based on hopp's `direct_composition.rs`:

- D3D11 device creation
- IDCompositionDesktopDevice for compositor integration
- Visual tree setup for transparent rendering

This is complex - defer detailed Windows implementation to follow-up story.

### 4. Core Integration

Current Core architecture:
```
Tauri App ←→ Socket ←→ Core Sidecar
                         ├── Screen Capture
                         └── [NEW] Overlay Rendering
```

New socket messages needed:
```rust
enum Message {
    // Existing...
    CreateOverlay { bounds: Bounds },
    DestroyOverlay,
    UpdateOverlayBounds { bounds: Bounds },
    // Future (Epic 4)...
    DrawAnnotation { stroke: StrokeData },
    ClearAnnotations,
}
```

### 5. Event Loop Architecture

hopp uses winit's event loop as the main loop:

```rust
impl ApplicationHandler<UserEvent> for Application {
    fn user_event(&mut self, event_loop: &ActiveEventLoop, event: UserEvent) {
        // Handle socket messages as user events
    }

    fn window_event(&mut self, ..., event: WindowEvent) {
        WindowEvent::RedrawRequested => {
            self.gfx.draw(&self.annotations);
        }
    }
}
```

Questions to answer:
- Can we add this to existing Core without breaking capture?
- Do we need separate threads for capture vs overlay?
- How does this interact with tokio runtime in Core?

## Implementation Plan

### Phase 1: Basic Window (Day 1) ✅
- [x] Add winit dependency to Core (already had it)
- [x] Create overlay window on command (`graphics::OverlayWindow::new()`)
- [x] Verify transparency and click-through on macOS (`set_cursor_hittest(false)`)
- [x] Add show/hide commands via socket (`UserEvent::SetOverlayVisible`)

### Phase 2: wgpu Rendering (Day 1-2) ✅
- [x] Initialize wgpu surface (`graphics::GraphicsContext::new()`)
- [x] Render solid transparent background (clear to `a: 0.0`)
- [x] Render simple colored rectangle (`render_test_rectangle()`)
- [x] Verify alpha blending works (`CompositeAlphaMode::PreMultiplied`)

### Phase 3: Integration (Day 2) ✅
- [x] Wire up socket messages for overlay control
- [x] Integration with Tauri app via `render_overlay()` → `render_annotations()`
- [ ] Measure performance (render latency, memory) - deferred to Epic 4

### Phase 4: Documentation (Day 2) - In Progress
- [x] Document findings (this document)
- [ ] Update architecture decisions
- [ ] Create follow-up stories for Epic 4

## Dependencies to Add

```toml
# packages/core/Cargo.toml
[dependencies]
winit = "0.30"
wgpu = "24.0"
pollster = "0.4"  # For blocking on async wgpu calls
bytemuck = { version = "1.14", features = ["derive"] }  # For GPU buffer data

# For annotation rendering (evaluate during spike)
# lyon = "1.0"  # 2D path tessellation
# image = "0.25"  # Texture loading
```

## Reference Files (hopp)

- `hopp-main/core/src/lib.rs` - Window creation, event loop
- `hopp-main/core/src/graphics/graphics_context.rs` - wgpu setup
- `hopp-main/core/src/graphics/direct_composition.rs` - Windows transparency
- `hopp-main/core/src/overlay_window.rs` - Coordinate transforms

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| wgpu complexity | Start with minimal shader, iterate |
| Windows transparency | Defer to follow-up, focus on macOS first |
| Event loop conflicts | May need separate thread for overlay |
| Shader development | Use hopp shaders as reference |

## Output Artifacts

1. Working POC in `packages/core/src/overlay/`
2. Updated architecture documentation
3. Follow-up stories for production implementation
4. Performance benchmarks vs WebView approach

## Implementation Summary

### Files Created/Modified

**New Files:**
- `packages/core/src/graphics/shader.wgsl` - WGSL vertex/fragment shader for colored geometry

**Modified Files:**
- `packages/core/src/graphics/mod.rs` - Added:
  - `ColoredVertex` struct with position and color attributes
  - `render_pipeline` field to `GraphicsContext`
  - `render_with_vertices()` - Core rendering method with vertex buffer
  - `render_test_rectangle()` - Renders semi-transparent red rectangle at center
  - `render_rectangle()` - Renders rectangle at specific pixel coordinates

### Key Implementation Details

1. **Shader Pipeline**: Simple WGSL shader with position (vec2) and color (vec4) vertex attributes. Uses premultiplied alpha blending for proper transparency compositing.

2. **Blend State**: Configured for premultiplied alpha:
   - src_factor: One
   - dst_factor: OneMinusSrcAlpha
   - This matches hopp's approach and works correctly with transparent overlays

3. **Coordinate System**:
   - Internal rendering uses clip space (-1 to 1)
   - `render_rectangle()` provides pixel-coordinate API with automatic conversion
   - Y-axis is flipped for screen coordinates (top-down)

4. **Integration Flow**:
   ```
   main.rs: WindowEvent::RedrawRequested
     → app.render_overlay()
       → graphics_context.render_annotations()
         → render_test_rectangle() [spike validation]
   ```

### Next Steps for Epic 4

1. **Stroke Rendering**: Extend shader to support line strips with variable width
2. **Cursor Rendering**: Add texture support for cursor images
3. **Performance**: Profile render latency, consider persistent vertex buffers
4. **Windows Validation**: Test DirectComposition integration thoroughly

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-17 | Created spike | Dev Agent |
| 2025-12-17 | Implemented rectangle rendering with wgpu shader pipeline | Dev Agent |
