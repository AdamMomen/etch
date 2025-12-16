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

use std::io::Cursor;
use std::sync::{mpsc, Arc, Mutex as StdMutex};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use livekit::webrtc::{
    desktop_capturer::{CaptureResult, DesktopCapturer, DesktopFrame},
    native::yuv_helper,
    prelude::{I420Buffer, VideoFrame, VideoRotation},
    video_source::native::NativeVideoSource,
};
use parking_lot::Mutex;
use winit::event_loop::EventLoopProxy;

use crate::{CaptureConfig, ScreenInfo, SourceType, UserEvent};

/// Frame capture interval in milliseconds (~45fps)
const FRAME_CAPTURE_INTERVAL_MS: u64 = 22;

/// Maximum consecutive failures before giving up
const MAX_FAILURES: u64 = 10;

/// Target thumbnail width
const THUMBNAIL_WIDTH: u32 = 320;

/// Target thumbnail height
const THUMBNAIL_HEIGHT: u32 = 180;

/// JPEG quality for thumbnails (0-100)
const THUMBNAIL_QUALITY: u8 = 75;

/// Polling interval for thumbnail capture (ms)
const THUMBNAIL_POLL_INTERVAL_MS: u64 = 16;

/// Total timeout for all thumbnail captures (seconds)
const THUMBNAIL_TOTAL_TIMEOUT_SECS: u64 = 10;

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

    /// Enumerate available screens with thumbnail previews
    ///
    /// Uses parallel thumbnail capture (like Hopp) for fast enumeration.
    /// Note: Window capture is not supported - only screens are returned.
    pub fn enumerate_sources(&self) -> Vec<ScreenInfo> {
        // Create a temporary capturer to enumerate sources
        let capturer = DesktopCapturer::new(|_, _| {}, false, false);

        if capturer.is_none() {
            tracing::error!("Failed to create DesktopCapturer for enumeration");
            return vec![];
        }

        let capturer = capturer.unwrap();
        let sources = capturer.get_source_list();
        let source_count = sources.len();

        tracing::info!("enumerate_sources: found {} sources (screens only)", source_count);

        // Shared storage for thumbnail results: (source_id, index, thumbnail_base64)
        let results: Arc<StdMutex<Vec<(u64, usize, String)>>> = Arc::new(StdMutex::new(Vec::new()));

        // Collect source metadata and spawn parallel capture threads
        let mut screens = Vec::new();
        let mut handles = Vec::new();

        for source in sources {
            let id = source.id();
            let title = source.title();

            // All sources are treated as screens (window capture not supported)
            let screen_idx = screens.len();
            let name = if title.is_empty() {
                format!("Display {}", screens.len() + 1)
            } else {
                title.clone()
            };
            screens.push(ScreenInfo {
                id: format!("screen:{}", id),
                name: name.clone(),
                width: 1920,
                height: 1080,
                is_primary: screens.is_empty(),
                thumbnail: None,
            });

            // Spawn thread for parallel thumbnail capture
            let results_clone = results.clone();
            let (stop_tx, stop_rx) = std::sync::mpsc::channel::<()>();

            let handle = std::thread::spawn(move || {
                capture_thumbnail_thread(
                    id,
                    screen_idx,
                    name,
                    results_clone,
                    stop_rx,
                );
            });

            handles.push((handle, stop_tx));
        }

        // Wait for all thumbnails to be captured (or timeout)
        let start_time = std::time::Instant::now();
        let timeout = std::time::Duration::from_secs(THUMBNAIL_TOTAL_TIMEOUT_SECS);

        loop {
            {
                let res = results.lock().unwrap();
                if res.len() >= source_count {
                    tracing::info!("All {} thumbnails captured", res.len());
                    break;
                }
            }

            if start_time.elapsed() > timeout {
                tracing::warn!(
                    "Thumbnail capture timeout after {:?}, got {}/{} thumbnails",
                    start_time.elapsed(),
                    results.lock().unwrap().len(),
                    source_count
                );
                break;
            }

            std::thread::sleep(std::time::Duration::from_millis(33));
        }

        // Stop all capture threads
        for (handle, stop_tx) in handles {
            let _ = stop_tx.send(());
            let _ = handle.join();
        }

        // Apply thumbnails to results
        {
            let res = results.lock().unwrap();
            for (_, idx, thumbnail) in res.iter() {
                if let Some(screen) = screens.get_mut(*idx) {
                    screen.thumbnail = Some(thumbnail.clone());
                }
            }
        }

        tracing::info!(
            "enumerate_sources: completed in {:?} with {} screens",
            start_time.elapsed(),
            screens.len()
        );

        screens
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

/// Capture thumbnail in a dedicated thread (Hopp-style parallel capture)
///
/// This function runs in its own thread and captures a thumbnail for a single screen.
/// It creates its own DesktopCapturer, finds the source by ID, and captures a thumbnail.
/// Results are written to the shared results vector.
fn capture_thumbnail_thread(
    source_id: u64,
    idx: usize,
    display_name: String,
    results: Arc<StdMutex<Vec<(u64, usize, String)>>>,
    stop_rx: mpsc::Receiver<()>,
) {
    tracing::debug!("Starting thumbnail capture thread for screen {} ({})", source_id, display_name);

    // Check if we already have a result for this source (avoid duplicates)
    {
        let res = results.lock().unwrap();
        for (id, _, _) in res.iter() {
            if *id == source_id {
                tracing::debug!("Thumbnail already captured for screen {}", source_id);
                return;
            }
        }
    }

    // Shared state for the callback
    let results_cb = results.clone();
    let captured = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let captured_cb = captured.clone();

    // Create callback that processes frame and stores result
    let callback = move |result: CaptureResult, frame: DesktopFrame| {
        // Skip if already captured
        if captured_cb.load(std::sync::atomic::Ordering::SeqCst) {
            return;
        }

        match result {
            CaptureResult::ErrorTemporary => {
                // Temporary error - ignore, polling will retry
                return;
            }
            CaptureResult::ErrorPermanent | CaptureResult::ErrorUserStopped => {
                tracing::debug!("Thumbnail capture error for screen {}", source_id);
                // Store empty result so main thread knows we're done
                let mut res = results_cb.lock().unwrap();
                res.push((source_id, idx, String::new()));
                captured_cb.store(true, std::sync::atomic::Ordering::SeqCst);
                return;
            }
            _ => {}
        }

        let width = frame.width();
        let height = frame.height();
        let stride = frame.stride();
        let data = frame.data();

        if width <= 0 || height <= 0 || data.is_empty() {
            return;
        }

        // Remove padding and convert ARGB to RGB
        let mut raw_rgb: Vec<u8> = Vec::with_capacity((width * height * 3) as usize);

        for y in 0..height {
            for x in 0..width {
                let src_idx = (y * stride as i32 + x * 4) as usize;
                if src_idx + 3 < data.len() {
                    // ARGB -> RGB (skip alpha, reorder BGR to RGB)
                    raw_rgb.push(data[src_idx + 2]); // R
                    raw_rgb.push(data[src_idx + 1]); // G
                    raw_rgb.push(data[src_idx]);     // B
                }
            }
        }

        // Scale and encode to JPEG
        if let Some(thumbnail) = create_thumbnail_from_rgb(&raw_rgb, width as u32, height as u32) {
            tracing::info!("Thumbnail captured for screen {} ({})", source_id, display_name);
            let mut res = results_cb.lock().unwrap();
            res.push((source_id, idx, thumbnail));
            captured_cb.store(true, std::sync::atomic::Ordering::SeqCst);
        }
    };

    // Create capturer for this thread
    let capturer = DesktopCapturer::new(callback, false, false);
    if capturer.is_none() {
        tracing::error!("Failed to create DesktopCapturer for screen {}", source_id);
        // Store empty result so main thread knows we're done
        let mut res = results.lock().unwrap();
        res.push((source_id, idx, String::new()));
        return;
    }
    let mut capturer = capturer.unwrap();

    // Find the source by ID in this thread's capturer
    let sources = capturer.get_source_list();
    let source = sources.iter().find(|s| s.id() == source_id);

    if source.is_none() {
        tracing::warn!("Screen {} not found in thread capturer", source_id);
        // Store empty result so main thread knows we're done
        let mut res = results.lock().unwrap();
        res.push((source_id, idx, String::new()));
        return;
    }

    // Start capture for this source
    capturer.start_capture(source.unwrap().clone());

    // Poll until captured or stopped
    loop {
        // Check for stop signal (non-blocking)
        match stop_rx.recv_timeout(std::time::Duration::from_millis(THUMBNAIL_POLL_INTERVAL_MS)) {
            Ok(()) => {
                // Stop signal received
                tracing::debug!("Stop signal received for screen {}", source_id);
                break;
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Timeout - request another frame
                capturer.capture_frame();
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                // Channel closed
                break;
            }
        }

        // Check if we've captured the thumbnail
        if captured.load(std::sync::atomic::Ordering::SeqCst) {
            break;
        }
    }
}

/// Create a JPEG base64 thumbnail from RGB pixel data
fn create_thumbnail_from_rgb(rgb_data: &[u8], width: u32, height: u32) -> Option<String> {
    // Create image buffer from raw RGB data
    let img: image::RgbImage = image::ImageBuffer::from_raw(width, height, rgb_data.to_vec())?;

    // Calculate thumbnail dimensions maintaining aspect ratio
    let (thumb_width, thumb_height) = {
        let aspect = width as f32 / height as f32;
        let target_aspect = THUMBNAIL_WIDTH as f32 / THUMBNAIL_HEIGHT as f32;

        if aspect > target_aspect {
            (THUMBNAIL_WIDTH, (THUMBNAIL_WIDTH as f32 / aspect) as u32)
        } else {
            ((THUMBNAIL_HEIGHT as f32 * aspect) as u32, THUMBNAIL_HEIGHT)
        }
    };

    // Resize using fast algorithm
    let resized = image::imageops::resize(
        &img,
        thumb_width,
        thumb_height,
        image::imageops::FilterType::Triangle,
    );

    // Encode to JPEG
    let mut jpeg_buffer = Cursor::new(Vec::new());
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_buffer, THUMBNAIL_QUALITY);

    if let Err(e) = encoder.encode(
        resized.as_raw(),
        resized.width(),
        resized.height(),
        image::ExtendedColorType::Rgb8,
    ) {
        tracing::warn!("Failed to encode thumbnail: {}", e);
        return None;
    }

    // Base64 encode
    let jpeg_bytes = jpeg_buffer.into_inner();
    Some(BASE64.encode(&jpeg_bytes))
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
