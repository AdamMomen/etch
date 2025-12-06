//! NAMELESS Core - Media engine for screen sharing and annotations
//!
//! This crate implements the Core-centric architecture where a dedicated Rust binary
//! owns all media: screen capture, audio, camera, LiveKit connection, and DataTracks.
//!
//! Architecture based on Hopp's patterns:
//! - winit EventLoop as central message bus
//! - UserEvent enum as command vocabulary
//! - Application struct holds all components
//! - Socket IPC between Core and Tauri WebView

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use tokio::task::JoinHandle;
use winit::event_loop::EventLoopProxy;

pub mod annotation;
pub mod capture;
pub mod graphics;
pub mod room;
pub mod socket;

// Re-export key types
pub use annotation::{AnnotationStore, Stroke};
pub use socket::{CoreSocket, IncomingMessage, OutgoingMessage};

/// All possible events that can be dispatched through the event loop.
/// This is the central command vocabulary for the Core process.
///
/// Events flow from multiple sources:
/// - Socket messages from Tauri WebView
/// - LiveKit room callbacks
/// - Internal state changes
/// - Window/input events
#[derive(Debug, Clone)]
pub enum UserEvent {
    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN CAPTURE
    // ═══════════════════════════════════════════════════════════════════════
    /// Request list of available screens and windows for capture
    GetAvailableContent,

    /// Start screen sharing with the specified source
    StartScreenShare(ScreenShareMessage),

    /// Stop current screen share
    StopScreenShare,

    /// Screen share state changed (internal notification)
    ScreenShareStateChanged {
        is_sharing: bool,
        source_id: Option<String>,
    },

    /// Available content enumerated (response to GetAvailableContent)
    AvailableContentReady {
        screens: Vec<ScreenInfo>,
        windows: Vec<WindowInfo>,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ANNOTATIONS (Core Feature)
    // ═══════════════════════════════════════════════════════════════════════
    /// Remote participant started drawing a stroke
    StrokeStart {
        stroke_id: String,
        participant_id: String,
        tool: AnnotationTool,
        color: Color,
        start_point: Point,
    },

    /// Remote participant added points to their stroke
    StrokeUpdate {
        stroke_id: String,
        points: Vec<Point>,
    },

    /// Remote participant completed their stroke
    StrokeComplete {
        stroke_id: String,
    },

    /// Delete a specific stroke (eraser or moderation)
    StrokeDelete {
        stroke_id: String,
    },

    /// Clear all annotations (host/sharer action)
    ClearAllAnnotations,

    /// Annotation permissions changed
    AnnotationPermissionChanged {
        enabled: bool,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // REMOTE CURSORS (Visual feedback only, no input simulation)
    // ═══════════════════════════════════════════════════════════════════════
    /// Remote participant moved their cursor on the shared screen
    RemoteCursorPosition {
        participant_id: String,
        x: f32, // Normalized 0.0-1.0
        y: f32,
        visible: bool,
    },

    /// Remote cursor style changed (different tools show different cursors)
    RemoteCursorStyle {
        participant_id: String,
        style: CursorStyle,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LIVEKIT / ROOM EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    /// Connect to LiveKit room
    JoinRoom {
        server_url: String,
        token: String,
    },

    /// Leave the current room
    LeaveRoom,

    /// Room connected successfully
    RoomConnected {
        room_name: String,
    },

    /// Room disconnected
    RoomDisconnected,

    /// Participant connected to the room
    ParticipantConnected(ParticipantData),

    /// Participant disconnected from the room
    ParticipantDisconnected(ParticipantData),

    /// Connection state changed
    ConnectionStateChanged(ConnectionState),

    /// DataTrack message received (annotations, chat, etc.)
    DataReceived {
        participant_id: String,
        payload: Vec<u8>,
    },

    /// Screen share track published
    ScreenSharePublished,

    /// Screen share track unpublished
    ScreenShareUnpublished,

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO/VIDEO CONTROLS
    // ═══════════════════════════════════════════════════════════════════════
    /// Toggle microphone mute
    SetMicrophoneMuted(bool),

    /// Toggle camera
    SetCameraEnabled(bool),

    /// Change audio input device
    SetAudioInputDevice(String),

    /// Change video input device
    SetVideoInputDevice(String),

    // ═══════════════════════════════════════════════════════════════════════
    // FRAME RELAY (Core → WebView)
    // ═══════════════════════════════════════════════════════════════════════
    /// Video frame ready to send to WebView for display
    VideoFrameReady {
        participant_id: String,
        track_id: String,
        frame_data: Vec<u8>,
        width: u32,
        height: u32,
        format: FrameFormat,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // GRAPHICS / RENDERING
    // ═══════════════════════════════════════════════════════════════════════
    /// Request overlay window redraw
    RequestRedraw,

    /// Overlay window visibility changed
    SetOverlayVisible(bool),

    /// Update overlay position to match shared screen
    UpdateOverlayBounds {
        x: i32,
        y: i32,
        width: u32,
        height: u32,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SOCKET EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    /// Socket client connected
    SocketConnected,

    /// Socket client disconnected
    SocketDisconnected,

    /// Error occurred
    Error {
        code: String,
        message: String,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════
    /// Graceful shutdown
    Terminate,
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/// Screen share initiation message
#[derive(Debug, Clone)]
pub struct ScreenShareMessage {
    pub source_id: String,
    pub source_type: SourceType,
    pub config: CaptureConfig,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceType {
    Screen,
    Window,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CaptureConfig {
    pub width: u32,
    pub height: u32,
    pub framerate: u32,
    pub bitrate: u32,
}

impl Default for CaptureConfig {
    fn default() -> Self {
        Self {
            width: 1920,
            height: 1080,
            framerate: 60,
            bitrate: 6_000_000, // 6 Mbps
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScreenInfo {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WindowInfo {
    pub id: String,
    pub title: String,
    pub app_name: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnnotationTool {
    Pen,
    Highlighter,
    Eraser,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct Point {
    pub x: f32, // Normalized 0.0-1.0
    pub y: f32,
    #[serde(default = "default_pressure")]
    pub pressure: f32,
}

fn default_pressure() -> f32 {
    1.0
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

impl Color {
    pub const RED: Color = Color { r: 255, g: 87, b: 87, a: 255 };
    pub const BLUE: Color = Color { r: 87, g: 166, b: 255, a: 255 };
    pub const GREEN: Color = Color { r: 87, g: 255, b: 144, a: 255 };
    pub const ORANGE: Color = Color { r: 255, g: 193, b: 87, a: 255 };
    pub const PURPLE: Color = Color { r: 200, g: 87, b: 255, a: 255 };
    pub const PINK: Color = Color { r: 255, g: 87, b: 200, a: 255 };

    pub const PALETTE: [Color; 6] = [
        Self::RED,
        Self::BLUE,
        Self::GREEN,
        Self::ORANGE,
        Self::PURPLE,
        Self::PINK,
    ];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CursorStyle {
    Default,
    Pen,
    Highlighter,
    Eraser,
    Hidden,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FrameFormat {
    Jpeg,
    Rgba,
    Nv12,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ParticipantData {
    pub id: String,
    pub name: String,
    pub is_local: bool,
    pub role: ParticipantRole,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ParticipantRole {
    Host,
    Participant,
}

// ═══════════════════════════════════════════════════════════════════════════════
// REMOTE CURSOR STATE
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone)]
pub struct RemoteCursor {
    pub participant_id: String,
    pub x: f32,
    pub y: f32,
    pub visible: bool,
    pub style: CursorStyle,
    pub color: Color,
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLICATION (Central Component Container)
// ═══════════════════════════════════════════════════════════════════════════════

/// Main application struct holding all components.
/// Follows Hopp's pattern of centralized state management.
///
/// All state mutations happen through UserEvent dispatch,
/// ensuring single-threaded coordination and predictable event ordering.
pub struct Application {
    // ═══════════════════════════════════════════════════════════════════════
    // EVENT DISPATCH
    // ═══════════════════════════════════════════════════════════════════════
    /// Proxy to send events to the main event loop from any thread
    event_loop_proxy: EventLoopProxy<UserEvent>,

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN CAPTURE
    // ═══════════════════════════════════════════════════════════════════════
    /// Screen capturer (thread-safe, may be capturing on background thread)
    screen_capturer: Arc<Mutex<capture::Capturer>>,

    /// Handle to capturer event forwarding task
    _capturer_events_task: Option<JoinHandle<()>>,

    // ═══════════════════════════════════════════════════════════════════════
    // LIVEKIT
    // ═══════════════════════════════════════════════════════════════════════
    /// LiveKit room service (handles connection, tracks, DataTracks)
    room_service: Option<room::RoomService>,

    // ═══════════════════════════════════════════════════════════════════════
    // GRAPHICS (Overlay Rendering)
    // ═══════════════════════════════════════════════════════════════════════
    /// wgpu graphics context for overlay window
    _graphics_context: Option<graphics::GraphicsContext>,

    // ═══════════════════════════════════════════════════════════════════════
    // ANNOTATIONS
    // ═══════════════════════════════════════════════════════════════════════
    /// In-memory annotation store
    annotation_store: AnnotationStore,

    /// Remote cursor positions (participant_id → cursor state)
    remote_cursors: HashMap<String, RemoteCursor>,

    // ═══════════════════════════════════════════════════════════════════════
    // SOCKET (Communication with Tauri/WebView)
    // ═══════════════════════════════════════════════════════════════════════
    /// Socket server for Tauri communication
    socket: Option<CoreSocket>,

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════
    /// Current screen share state
    is_sharing: bool,

    /// Current shared source (if sharing)
    shared_source_id: Option<String>,

    /// Local participant info
    local_participant: Option<ParticipantData>,

    /// All participants in room
    participants: HashMap<String, ParticipantData>,

    /// Current connection state
    connection_state: ConnectionState,

    /// Annotations enabled
    annotations_enabled: bool,
}

impl Application {
    /// Create a new Application instance
    pub fn new(event_loop_proxy: EventLoopProxy<UserEvent>) -> Self {
        let screen_capturer = Arc::new(Mutex::new(capture::Capturer::new()));

        Self {
            event_loop_proxy,
            screen_capturer,
            _capturer_events_task: None,
            room_service: None,
            _graphics_context: None,
            annotation_store: AnnotationStore::new(),
            remote_cursors: HashMap::new(),
            socket: None,
            is_sharing: false,
            shared_source_id: None,
            local_participant: None,
            participants: HashMap::new(),
            connection_state: ConnectionState::Disconnected,
            annotations_enabled: true,
        }
    }

    /// Initialize the socket server
    pub async fn init_socket(&mut self, socket_path: &str) -> anyhow::Result<()> {
        let socket = CoreSocket::new(socket_path, self.event_loop_proxy.clone()).await?;
        self.socket = Some(socket);
        Ok(())
    }

    /// Get the event loop proxy for sending events from other threads
    pub fn event_loop_proxy(&self) -> EventLoopProxy<UserEvent> {
        self.event_loop_proxy.clone()
    }

    /// Handle UserEvent dispatched through the event loop
    pub fn handle_user_event(
        &mut self,
        event: UserEvent,
        elwt: &winit::event_loop::ActiveEventLoop,
    ) {
        match event {
            // ═══════════════════════════════════════════════════════════════
            // SCREEN CAPTURE EVENTS
            // ═══════════════════════════════════════════════════════════════
            UserEvent::GetAvailableContent => {
                self.handle_get_available_content();
            }

            UserEvent::StartScreenShare(msg) => {
                self.handle_start_screen_share(msg);
            }

            UserEvent::StopScreenShare => {
                self.handle_stop_screen_share();
            }

            UserEvent::ScreenShareStateChanged { is_sharing, source_id } => {
                self.is_sharing = is_sharing;
                self.shared_source_id = source_id;
                self.send_screen_share_state();
            }

            UserEvent::AvailableContentReady { screens, windows } => {
                self.send_available_content(screens, windows);
            }

            // ═══════════════════════════════════════════════════════════════
            // ANNOTATION EVENTS
            // ═══════════════════════════════════════════════════════════════
            UserEvent::StrokeStart {
                stroke_id,
                participant_id,
                tool,
                color,
                start_point,
            } => {
                self.annotation_store
                    .start_stroke(&stroke_id, &participant_id, tool, color, start_point);
                self.request_overlay_redraw();
            }

            UserEvent::StrokeUpdate { stroke_id, points } => {
                self.annotation_store.update_stroke(&stroke_id, &points);
                self.request_overlay_redraw();
            }

            UserEvent::StrokeComplete { stroke_id } => {
                self.annotation_store.complete_stroke(&stroke_id);
                self.request_overlay_redraw();
            }

            UserEvent::StrokeDelete { stroke_id } => {
                self.annotation_store.delete_stroke(&stroke_id);
                self.request_overlay_redraw();
            }

            UserEvent::ClearAllAnnotations => {
                self.annotation_store.clear_all();
                self.request_overlay_redraw();
            }

            UserEvent::AnnotationPermissionChanged { enabled } => {
                self.annotations_enabled = enabled;
            }

            // ═══════════════════════════════════════════════════════════════
            // REMOTE CURSOR EVENTS
            // ═══════════════════════════════════════════════════════════════
            UserEvent::RemoteCursorPosition {
                participant_id,
                x,
                y,
                visible,
            } => {
                if let Some(cursor) = self.remote_cursors.get_mut(&participant_id) {
                    cursor.x = x;
                    cursor.y = y;
                    cursor.visible = visible;
                } else {
                    let color = self.get_participant_color(&participant_id);
                    self.remote_cursors.insert(
                        participant_id.clone(),
                        RemoteCursor {
                            participant_id,
                            x,
                            y,
                            visible,
                            style: CursorStyle::Default,
                            color,
                        },
                    );
                }
                self.request_overlay_redraw();
            }

            UserEvent::RemoteCursorStyle {
                participant_id,
                style,
            } => {
                if let Some(cursor) = self.remote_cursors.get_mut(&participant_id) {
                    cursor.style = style;
                    self.request_overlay_redraw();
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // LIVEKIT EVENTS
            // ═══════════════════════════════════════════════════════════════
            UserEvent::JoinRoom { server_url, token } => {
                self.handle_join_room(server_url, token);
            }

            UserEvent::LeaveRoom => {
                self.handle_leave_room();
            }

            UserEvent::ParticipantConnected(data) => {
                self.participants.insert(data.id.clone(), data.clone());
                self.send_participant_joined(&data);
            }

            UserEvent::ParticipantDisconnected(data) => {
                self.participants.remove(&data.id);
                self.remote_cursors.remove(&data.id);
                self.send_participant_left(&data.id);
                self.request_overlay_redraw();
            }

            UserEvent::ConnectionStateChanged(state) => {
                self.connection_state = state;
                self.send_connection_state();
            }

            UserEvent::DataReceived {
                participant_id,
                payload,
            } => {
                self.handle_data_received(&participant_id, &payload);
            }

            // ═══════════════════════════════════════════════════════════════
            // AUDIO/VIDEO CONTROLS
            // ═══════════════════════════════════════════════════════════════
            UserEvent::SetMicrophoneMuted(muted) => {
                if let Some(room) = &self.room_service {
                    room.set_microphone_muted(muted);
                }
            }

            UserEvent::SetCameraEnabled(enabled) => {
                if let Some(room) = &self.room_service {
                    room.set_camera_enabled(enabled);
                }
            }

            UserEvent::SetAudioInputDevice(device_id) => {
                if let Some(room) = &self.room_service {
                    room.set_audio_input_device(&device_id);
                }
            }

            UserEvent::SetVideoInputDevice(device_id) => {
                if let Some(room) = &self.room_service {
                    room.set_video_input_device(&device_id);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // FRAME RELAY
            // ═══════════════════════════════════════════════════════════════
            UserEvent::VideoFrameReady {
                participant_id,
                track_id,
                frame_data,
                width,
                height,
                format,
            } => {
                self.send_video_frame(&participant_id, &track_id, frame_data, width, height, format);
            }

            // ═══════════════════════════════════════════════════════════════
            // GRAPHICS EVENTS
            // ═══════════════════════════════════════════════════════════════
            UserEvent::RequestRedraw => {
                // TODO: Request overlay window redraw when graphics context is implemented
            }

            UserEvent::SetOverlayVisible(_visible) => {
                // TODO: Set overlay visibility when graphics context is implemented
            }

            UserEvent::UpdateOverlayBounds { x: _, y: _, width: _, height: _ } => {
                // TODO: Update overlay bounds when graphics context is implemented
            }

            // ═══════════════════════════════════════════════════════════════
            // SOCKET EVENTS
            // ═══════════════════════════════════════════════════════════════
            UserEvent::SocketConnected => {
                tracing::info!("Socket client connected");
            }

            UserEvent::SocketDisconnected => {
                tracing::info!("Socket client disconnected");
            }

            UserEvent::Error { code, message } => {
                tracing::error!("Error [{}]: {}", code, message);
                self.send_error(&code, &message);
            }

            // ═══════════════════════════════════════════════════════════════
            // ROOM EVENTS (internal notifications)
            // ═══════════════════════════════════════════════════════════════
            UserEvent::RoomConnected { room_name } => {
                tracing::info!("Room connected: {}", room_name);
                // Notify WebView via socket if connected
            }

            UserEvent::RoomDisconnected => {
                tracing::info!("Room disconnected");
                // Notify WebView via socket if connected
            }

            UserEvent::ScreenSharePublished => {
                tracing::info!("Screen share track published");
                // Notify WebView that screen share is active
            }

            UserEvent::ScreenShareUnpublished => {
                tracing::info!("Screen share track unpublished");
                // Notify WebView that screen share ended
            }

            // ═══════════════════════════════════════════════════════════════
            // LIFECYCLE
            // ═══════════════════════════════════════════════════════════════
            UserEvent::Terminate => {
                self.handle_shutdown();
                elwt.exit();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    fn request_overlay_redraw(&self) {
        let _ = self.event_loop_proxy.send_event(UserEvent::RequestRedraw);
    }

    fn get_participant_color(&self, participant_id: &str) -> Color {
        let index = self
            .participants
            .keys()
            .position(|id| id == participant_id)
            .unwrap_or(0);
        Color::PALETTE[index % Color::PALETTE.len()]
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCREEN CAPTURE HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    fn handle_get_available_content(&self) {
        let capturer = self.screen_capturer.clone();
        let proxy = self.event_loop_proxy.clone();

        tokio::spawn(async move {
            let capturer = capturer.lock();
            let (screens, windows) = capturer.enumerate_sources();

            let _ = proxy.send_event(UserEvent::AvailableContentReady { screens, windows });
        });
    }

    fn handle_start_screen_share(&mut self, msg: ScreenShareMessage) {
        let capturer = self.screen_capturer.clone();
        let proxy = self.event_loop_proxy.clone();
        let source_id = msg.source_id.clone();

        tokio::spawn(async move {
            let mut capturer = capturer.lock();
            match capturer.start_capture(&msg.source_id, msg.source_type, &msg.config) {
                Ok(()) => {
                    let _ = proxy.send_event(UserEvent::ScreenShareStateChanged {
                        is_sharing: true,
                        source_id: Some(source_id),
                    });
                }
                Err(e) => {
                    let _ = proxy.send_event(UserEvent::Error {
                        code: "capture_failed".to_string(),
                        message: e.to_string(),
                    });
                }
            }
        });
    }

    fn handle_stop_screen_share(&mut self) {
        let mut capturer = self.screen_capturer.lock();
        capturer.stop_capture();

        let _ = self.event_loop_proxy.send_event(UserEvent::ScreenShareStateChanged {
            is_sharing: false,
            source_id: None,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ROOM HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════

    fn handle_join_room(&mut self, server_url: String, token: String) {
        let proxy = self.event_loop_proxy.clone();

        let _ = proxy.send_event(UserEvent::ConnectionStateChanged(ConnectionState::Connecting));

        tokio::spawn(async move {
            match room::RoomService::connect(&server_url, &token, proxy.clone()).await {
                Ok(_room_service) => {
                    // RoomService will send ParticipantConnected events
                    let _ = proxy.send_event(UserEvent::ConnectionStateChanged(ConnectionState::Connected));
                }
                Err(e) => {
                    let _ = proxy.send_event(UserEvent::Error {
                        code: "room_join_failed".to_string(),
                        message: e.to_string(),
                    });
                    let _ = proxy.send_event(UserEvent::ConnectionStateChanged(ConnectionState::Disconnected));
                }
            }
        });
    }

    fn handle_leave_room(&mut self) {
        if let Some(room) = self.room_service.take() {
            room.disconnect();
        }
        self.participants.clear();
        self.remote_cursors.clear();
        self.connection_state = ConnectionState::Disconnected;

        let _ = self
            .event_loop_proxy
            .send_event(UserEvent::ConnectionStateChanged(ConnectionState::Disconnected));
    }

    fn handle_data_received(&mut self, participant_id: &str, payload: &[u8]) {
        // Parse DataTrack message and dispatch appropriate event
        if let Ok(msg) = serde_json::from_slice::<socket::DataTrackMessage>(payload) {
            match msg {
                socket::DataTrackMessage::StrokeStart {
                    stroke_id,
                    tool,
                    color,
                    point,
                } => {
                    let _ = self.event_loop_proxy.send_event(UserEvent::StrokeStart {
                        stroke_id,
                        participant_id: participant_id.to_string(),
                        tool,
                        color,
                        start_point: point,
                    });
                }
                socket::DataTrackMessage::StrokeUpdate { stroke_id, points } => {
                    let _ = self.event_loop_proxy.send_event(UserEvent::StrokeUpdate {
                        stroke_id,
                        points,
                    });
                }
                socket::DataTrackMessage::StrokeComplete { stroke_id } => {
                    let _ = self.event_loop_proxy.send_event(UserEvent::StrokeComplete { stroke_id });
                }
                socket::DataTrackMessage::StrokeDelete { stroke_id } => {
                    let _ = self.event_loop_proxy.send_event(UserEvent::StrokeDelete { stroke_id });
                }
                socket::DataTrackMessage::ClearAll => {
                    let _ = self.event_loop_proxy.send_event(UserEvent::ClearAllAnnotations);
                }
                socket::DataTrackMessage::CursorMove { x, y, visible } => {
                    let _ = self.event_loop_proxy.send_event(UserEvent::RemoteCursorPosition {
                        participant_id: participant_id.to_string(),
                        x,
                        y,
                        visible,
                    });
                }
            }
        }
    }

    fn handle_shutdown(&mut self) {
        tracing::info!("Shutting down Core...");

        // Stop screen capture
        self.screen_capturer.lock().stop_capture();

        // Disconnect from room
        if let Some(room) = self.room_service.take() {
            room.disconnect();
        }

        // Close socket
        if let Some(socket) = self.socket.take() {
            socket.shutdown();
        }

        tracing::info!("Core shutdown complete");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SOCKET SENDERS
    // ═══════════════════════════════════════════════════════════════════════════

    fn send_available_content(&self, screens: Vec<ScreenInfo>, windows: Vec<WindowInfo>) {
        if let Some(socket) = &self.socket {
            socket.send(OutgoingMessage::AvailableContent { screens, windows });
        }
    }

    fn send_screen_share_state(&self) {
        if let Some(socket) = &self.socket {
            if self.is_sharing {
                socket.send(OutgoingMessage::ScreenShareStarted {
                    sharer_id: self
                        .local_participant
                        .as_ref()
                        .map(|p| p.id.clone())
                        .unwrap_or_default(),
                });
            } else {
                socket.send(OutgoingMessage::ScreenShareStopped);
            }
        }
    }

    fn send_participant_joined(&self, data: &ParticipantData) {
        if let Some(socket) = &self.socket {
            socket.send(OutgoingMessage::ParticipantJoined {
                participant: data.clone(),
            });
        }
    }

    fn send_participant_left(&self, participant_id: &str) {
        if let Some(socket) = &self.socket {
            socket.send(OutgoingMessage::ParticipantLeft {
                participant_id: participant_id.to_string(),
            });
        }
    }

    fn send_connection_state(&self) {
        if let Some(socket) = &self.socket {
            socket.send(OutgoingMessage::ConnectionStateChanged {
                state: self.connection_state,
            });
        }
    }

    fn send_video_frame(
        &self,
        participant_id: &str,
        track_id: &str,
        frame_data: Vec<u8>,
        width: u32,
        height: u32,
        format: FrameFormat,
    ) {
        if let Some(socket) = &self.socket {
            socket.send(OutgoingMessage::VideoFrame {
                participant_id: participant_id.to_string(),
                track_id: track_id.to_string(),
                width,
                height,
                format,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                frame_data,
            });
        }
    }

    fn send_error(&self, code: &str, message: &str) {
        if let Some(socket) = &self.socket {
            socket.send(OutgoingMessage::Error {
                code: code.to_string(),
                message: message.to_string(),
            });
        }
    }
}
