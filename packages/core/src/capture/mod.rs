//! Screen capture module using LiveKit DesktopCapturer
//!
//! This module handles screen/window enumeration and capture using
//! Hopp's LiveKit fork which exposes libwebrtc's DesktopCapturer.
//!
//! Architecture based on Hopp's capture system:
//! - DesktopCapturer for native screen capture (60fps)
//! - I420 color space for WebRTC compatibility (same as Hopp)
//! - NativeVideoSource for publishing to LiveKit
//! - Reusable VideoFrame wrapped in Arc<Mutex> to avoid per-frame allocation

use std::sync::{mpsc, Arc, Mutex as StdMutex};

use livekit::webrtc::{
    desktop_capturer::{CaptureResult, DesktopCapturer, DesktopFrame},
    native::yuv_helper,
    prelude::{I420Buffer, VideoFrame, VideoRotation},
    video_source::native::NativeVideoSource,
};
use parking_lot::Mutex;
use winit::event_loop::EventLoopProxy;

use crate::{CaptureConfig, ScreenInfo, SourceType, UserEvent, WindowInfo};

/// Frame capture interval in milliseconds (~45fps)
const FRAME_CAPTURE_INTERVAL_MS: u64 = 22;

/// Maximum consecutive failures before giving up
const MAX_FAILURES: u64 = 10;

/// Errors that can occur during screen capture
#[derive(Debug, thiserror::Error)]
pub enum CaptureError {
    #[error("Failed to create DesktopCapturer")]
    CapturerCreationFailed,

    #[error("Capture source list is empty")]
    NoSourcesAvailable,

    #[error("Selected source not found: {0}")]
    SourceNotFound(String),

    #[error("Capture failed: {0}")]
    CaptureFailed(String),
}

/// Messages for stream runtime control
enum StreamMessage {
    Stop,
    #[allow(dead_code)]
    Failed,
}

/// Screen capturer using LiveKit DesktopCapturer
pub struct Capturer {
    event_loop_proxy: Option<EventLoopProxy<UserEvent>>,
    is_capturing: bool,
    current_source: Option<String>,
    video_source: Option<NativeVideoSource>,
    stream_tx: Option<mpsc::Sender<StreamMessage>>,
    capture_thread: Option<std::thread::JoinHandle<()>>,
}

impl Capturer {
    pub fn new() -> Self {
        Self {
            event_loop_proxy: None,
            is_capturing: false,
            current_source: None,
            video_source: None,
            stream_tx: None,
            capture_thread: None,
        }
    }

    /// Set the event loop proxy for sending events
    pub fn set_event_loop_proxy(&mut self, proxy: EventLoopProxy<UserEvent>) {
        self.event_loop_proxy = Some(proxy);
    }

    /// Set the video source for publishing frames to LiveKit
    pub fn set_video_source(&mut self, source: NativeVideoSource) {
        self.video_source = Some(source);
    }

    /// Enumerate available screens and windows
    pub fn enumerate_sources(&self) -> (Vec<ScreenInfo>, Vec<WindowInfo>) {
        // Create a temporary capturer to enumerate sources
        let capturer = DesktopCapturer::new(|_, _| {}, false, false);

        if capturer.is_none() {
            tracing::error!("Failed to create DesktopCapturer for enumeration");
            return (vec![], vec![]);
        }

        let capturer = capturer.unwrap();
        let sources = capturer.get_source_list();

        tracing::info!("enumerate_sources: found {} sources", sources.len());

        let mut screens = Vec::new();
        let mut windows = Vec::new();

        for source in sources {
            let id = source.id();
            let title = source.title();

            // DesktopCapturer returns both screens and windows
            // We differentiate based on whether it has a title
            if title.is_empty() || title.starts_with("Display") {
                screens.push(ScreenInfo {
                    id: format!("screen:{}", id),
                    name: if title.is_empty() {
                        format!("Display {}", screens.len() + 1)
                    } else {
                        title
                    },
                    width: 1920, // TODO: Get actual dimensions
                    height: 1080,
                    is_primary: screens.is_empty(),
                });
            } else {
                windows.push(WindowInfo {
                    id: format!("window:{}", id),
                    title: title.clone(),
                    app_name: title, // TODO: Extract app name
                    width: 1280,
                    height: 720,
                });
            }
        }

        (screens, windows)
    }

    /// Start capturing the specified source
    pub fn start_capture(
        &mut self,
        source_id: &str,
        _source_type: SourceType,
        config: &CaptureConfig,
    ) -> Result<(), CaptureError> {
        if self.is_capturing {
            self.stop_capture();
        }

        tracing::info!("Starting capture of source: {}", source_id);

        // Parse the numeric ID from source_id (format: "screen:123" or "window:456")
        let id: u64 = source_id
            .split(':')
            .nth(1)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| CaptureError::SourceNotFound(source_id.to_string()))?;

        // Create channel for stream control
        let (tx, rx) = mpsc::channel();
        self.stream_tx = Some(tx);

        // Clone what we need for the capture thread
        let video_source = self.video_source.clone();
        let width = config.width;
        let height = config.height;
        let event_proxy = self.event_loop_proxy.clone();

        // Spawn capture thread
        let handle = std::thread::spawn(move || {
            run_capture_loop(id, width, height, rx, video_source, event_proxy);
        });

        self.capture_thread = Some(handle);
        self.is_capturing = true;
        self.current_source = Some(source_id.to_string());

        Ok(())
    }

    /// Stop capturing
    pub fn stop_capture(&mut self) {
        if !self.is_capturing {
            return;
        }

        tracing::info!("Stopping capture");

        // Send stop signal to capture thread
        if let Some(tx) = self.stream_tx.take() {
            let _ = tx.send(StreamMessage::Stop);
        }

        // Wait for thread to finish
        if let Some(handle) = self.capture_thread.take() {
            let _ = handle.join();
        }

        self.is_capturing = false;
        self.current_source = None;
    }

    /// Check if currently capturing
    pub fn is_capturing(&self) -> bool {
        self.is_capturing
    }

    /// Get current source ID
    pub fn current_source(&self) -> Option<&str> {
        self.current_source.as_deref()
    }
}

impl Default for Capturer {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for Capturer {
    fn drop(&mut self) {
        self.stop_capture();
    }
}

/// Run the capture loop in a separate thread
fn run_capture_loop(
    source_id: u64,
    target_width: u32,
    target_height: u32,
    rx: mpsc::Receiver<StreamMessage>,
    video_source: Option<NativeVideoSource>,
    event_proxy: Option<EventLoopProxy<UserEvent>>,
) {
    tracing::info!(
        "Capture loop started for source {} at {}x{}",
        source_id,
        target_width,
        target_height
    );

    // Create shared state for the callback
    let video_source = Arc::new(Mutex::new(video_source));
    let failures = Arc::new(Mutex::new(0u64));
    let should_stop = Arc::new(Mutex::new(false));

    // FPS counter state
    let frame_count = Arc::new(Mutex::new(0u64));
    let last_fps_log = Arc::new(Mutex::new(std::time::Instant::now()));

    // Create reusable VideoFrame with I420Buffer (Hopp pattern)
    // This avoids allocating a new buffer for each frame
    // Note: We'll resize on first frame if dimensions don't match
    let video_frame = Arc::new(StdMutex::new(VideoFrame {
        rotation: VideoRotation::VideoRotation0,
        buffer: I420Buffer::new(target_width, target_height),
        timestamp_us: 0,
    }));

    // Track current buffer dimensions to detect when resize is needed
    let buffer_dims = Arc::new(StdMutex::new((target_width, target_height)));

    // Clone for callback
    let video_source_cb = video_source.clone();
    let video_frame_cb = video_frame.clone();
    let buffer_dims_cb = buffer_dims.clone();
    let failures_cb = failures.clone();
    let should_stop_cb = should_stop.clone();
    let frame_count_cb = frame_count.clone();
    let last_fps_log_cb = last_fps_log.clone();

    // Create capture callback
    let callback = move |result: CaptureResult, frame: DesktopFrame| {
        if *should_stop_cb.lock() {
            return;
        }

        match result {
            CaptureResult::ErrorTemporary => {
                tracing::warn!("Capture temporary error");
                return;
            }
            CaptureResult::ErrorPermanent => {
                tracing::error!("Capture permanent error");
                let mut fail_count = failures_cb.lock();
                *fail_count += 1;
                if *fail_count > MAX_FAILURES {
                    tracing::error!("Too many capture failures, stopping");
                    *should_stop_cb.lock() = true;
                }
                return;
            }
            CaptureResult::ErrorUserStopped => {
                tracing::info!("User stopped capture");
                *should_stop_cb.lock() = true;
                return;
            }
            _ => {
                // Reset failure count on success
                *failures_cb.lock() = 0;
            }
        }

        let frame_width = frame.width();
        let frame_height = frame.height();
        let frame_stride = frame.stride();
        let frame_data = frame.data();

        if frame_width == 0 || frame_height == 0 {
            return;
        }

        tracing::trace!(
            "Captured frame: {}x{}, stride: {}",
            frame_width,
            frame_height,
            frame_stride
        );

        // Lock the reusable frame buffer and convert ABGR to I420 in-place
        // This follows the Hopp pattern for zero-allocation frame capture
        let mut framebuffer = video_frame_cb.lock().unwrap();

        // Check if we need to resize the buffer (first frame or resolution change)
        // Note: frame_width/height are i32 from libwebrtc, convert to u32
        let frame_w = frame_width as u32;
        let frame_h = frame_height as u32;
        {
            let mut dims = buffer_dims_cb.lock().unwrap();
            if dims.0 != frame_w || dims.1 != frame_h {
                tracing::info!(
                    "Resizing buffer from {}x{} to {}x{}",
                    dims.0,
                    dims.1,
                    frame_w,
                    frame_h
                );
                framebuffer.buffer = I420Buffer::new(frame_w, frame_h);
                *dims = (frame_w, frame_h);
            }
        }

        let buffer = &mut framebuffer.buffer;

        // Get mutable access to Y, U, V planes
        let (stride_y, stride_u, stride_v) = buffer.strides();
        let (data_y, data_u, data_v) = buffer.data_mut();

        // Convert ABGR to I420 (same as Hopp)
        // Note: DesktopCapturer provides ABGR format on most platforms
        yuv_helper::abgr_to_i420(
            frame_data,
            frame_stride,
            data_y,
            stride_y,
            data_u,
            stride_u,
            data_v,
            stride_v,
            frame_width,
            frame_height,
        );

        // Update timestamp
        framebuffer.timestamp_us = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_micros() as i64;

        // Publish frame to LiveKit (pass reference, not ownership)
        if let Some(source) = video_source_cb.lock().as_ref() {
            source.capture_frame(&*framebuffer);
        }

        // FPS counter - log every second
        {
            let mut count = frame_count_cb.lock();
            *count += 1;
            let mut last_log = last_fps_log_cb.lock();
            let elapsed = last_log.elapsed();
            if elapsed >= std::time::Duration::from_secs(1) {
                let fps = *count as f64 / elapsed.as_secs_f64();
                tracing::info!("Screen capture FPS: {:.1}", fps);
                *count = 0;
                *last_log = std::time::Instant::now();
            }
        }
    };

    // Create the capturer
    let capturer = DesktopCapturer::new(callback, false, true);
    if capturer.is_none() {
        tracing::error!("Failed to create DesktopCapturer");
        if let Some(proxy) = &event_proxy {
            let _ = proxy.send_event(UserEvent::Error {
                code: "capture_failed".to_string(),
                message: "Failed to create DesktopCapturer".to_string(),
            });
        }
        return;
    }

    let capturer = Arc::new(Mutex::new(capturer.unwrap()));

    // Find and select the source
    {
        let mut cap = capturer.lock();
        let sources = cap.get_source_list();
        let source = sources.iter().find(|s| s.id() == source_id);

        if let Some(source) = source {
            cap.start_capture(source.clone());
            tracing::info!("Started capture of source: {}", source_id);
        } else {
            tracing::error!("Source {} not found", source_id);
            if let Some(proxy) = &event_proxy {
                let _ = proxy.send_event(UserEvent::Error {
                    code: "source_not_found".to_string(),
                    message: format!("Source {} not found", source_id),
                });
            }
            return;
        }
    }

    // Capture loop
    loop {
        // Check for stop signal
        match rx.recv_timeout(std::time::Duration::from_millis(FRAME_CAPTURE_INTERVAL_MS)) {
            Ok(StreamMessage::Stop) => {
                tracing::info!("Received stop signal");
                break;
            }
            Ok(StreamMessage::Failed) => {
                tracing::error!("Stream failed");
                break;
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Capture frame
                if *should_stop.lock() {
                    break;
                }
                capturer.lock().capture_frame();
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                tracing::info!("Channel disconnected");
                break;
            }
        }
    }

    tracing::info!("Capture loop ended");
}
