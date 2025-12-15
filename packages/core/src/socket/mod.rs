//! Socket module for IPC between Core and Tauri WebView
//!
//! Uses Unix domain sockets on Unix systems and named pipes on Windows.
//! Protocol is JSON-based with binary frame payloads.

use std::sync::Arc;

use parking_lot::Mutex;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::mpsc;
use winit::event_loop::EventLoopProxy;

use crate::{
    AnnotationTool, CaptureConfig, Color, ConnectionState, FrameFormat, ParticipantData,
    PermissionState, Point, ScreenInfo, SourceType, UserEvent, WindowInfo,
};

/// Messages from WebView to Core
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum IncomingMessage {
    // Room
    JoinRoom {
        server_url: String,
        token: String,
    },
    LeaveRoom,

    // Screen share
    GetAvailableContent,
    StartScreenShare {
        source_id: String,
        source_type: SourceType,
        #[serde(default)]
        config: Option<CaptureConfig>,
    },
    StopScreenShare,

    // Annotations (local user drawing)
    SendAnnotation {
        stroke_id: String,
        tool: AnnotationTool,
        color: Color,
        points: Vec<Point>,
    },
    DeleteAnnotation {
        stroke_id: String,
    },
    ClearAnnotations,

    // Cursor (local user's cursor for others to see)
    CursorMove {
        x: f32,
        y: f32,
    },
    CursorHide,

    // Media
    SetMicMuted {
        muted: bool,
    },
    SetCameraEnabled {
        enabled: bool,
    },
    SetAudioInputDevice {
        device_id: String,
    },
    SetVideoInputDevice {
        device_id: String,
    },

    // Permissions
    CheckPermissions,
    RequestScreenRecordingPermission,

    // Lifecycle
    Ping,
    Shutdown,
}

/// Messages from Core to WebView
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum OutgoingMessage {
    // Screen sources
    AvailableContent {
        screens: Vec<ScreenInfo>,
        windows: Vec<WindowInfo>,
    },

    // Room state
    ParticipantJoined {
        participant: ParticipantData,
    },
    ParticipantLeft {
        participant_id: String,
    },
    ConnectionStateChanged {
        state: ConnectionState,
    },

    // Screen share
    ScreenShareStarted {
        sharer_id: String,
    },
    ScreenShareStopped,

    // Video frames
    VideoFrame {
        participant_id: String,
        track_id: String,
        width: u32,
        height: u32,
        timestamp: u64,
        format: FrameFormat,
        #[serde(with = "base64_serde")]
        frame_data: Vec<u8>,
    },

    // Permissions
    PermissionState {
        state: PermissionState,
    },

    // Responses
    Pong,

    // Errors
    Error {
        code: String,
        message: String,
    },
}

/// Base64 serialization for binary data
mod base64_serde {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&STANDARD.encode(bytes))
    }

    #[allow(dead_code)]
    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        STANDARD.decode(&s).map_err(serde::de::Error::custom)
    }
}

/// DataTrack messages for annotation sync
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DataTrackMessage {
    StrokeStart {
        stroke_id: String,
        tool: AnnotationTool,
        color: Color,
        point: Point,
    },
    StrokeUpdate {
        stroke_id: String,
        points: Vec<Point>,
    },
    StrokeComplete {
        stroke_id: String,
    },
    StrokeDelete {
        stroke_id: String,
    },
    ClearAll,
    CursorMove {
        x: f32,
        y: f32,
        visible: bool,
    },
}

/// Socket server for Tauri communication
pub struct CoreSocket {
    sender: mpsc::UnboundedSender<OutgoingMessage>,
    _shutdown: Arc<Mutex<bool>>,
}

impl CoreSocket {
    /// Create a new socket server
    pub async fn new(
        socket_path: &str,
        event_loop_proxy: EventLoopProxy<UserEvent>,
    ) -> anyhow::Result<Self> {
        let (sender, receiver) = mpsc::unbounded_channel();
        let shutdown = Arc::new(Mutex::new(false));

        // Remove existing socket file if it exists
        #[cfg(unix)]
        {
            let _ = std::fs::remove_file(socket_path);
        }

        // Start socket server
        let socket_path = socket_path.to_string();
        let shutdown_clone = shutdown.clone();

        tokio::spawn(async move {
            if let Err(e) =
                Self::run_server(&socket_path, receiver, event_loop_proxy, shutdown_clone).await
            {
                tracing::error!("Socket server error: {}", e);
            }
        });

        Ok(Self {
            sender,
            _shutdown: shutdown,
        })
    }

    /// Send a message to the connected client
    pub fn send(&self, msg: OutgoingMessage) {
        if let Err(e) = self.sender.send(msg) {
            tracing::warn!("Failed to send message: {}", e);
        }
    }

    /// Shutdown the socket server
    pub fn shutdown(self) {
        *self._shutdown.lock() = true;
    }

    #[cfg(unix)]
    async fn run_server(
        socket_path: &str,
        mut outgoing: mpsc::UnboundedReceiver<OutgoingMessage>,
        event_loop_proxy: EventLoopProxy<UserEvent>,
        shutdown: Arc<Mutex<bool>>,
    ) -> anyhow::Result<()> {
        use tokio::net::UnixListener;

        let listener = UnixListener::bind(socket_path)?;
        tracing::info!("Socket server listening on {}", socket_path);

        loop {
            if *shutdown.lock() {
                break;
            }

            tokio::select! {
                accept_result = listener.accept() => {
                    match accept_result {
                        Ok((stream, _)) => {
                            tracing::info!("Client connected");
                            let _ = event_loop_proxy.send_event(UserEvent::SocketConnected);

                            let (reader, mut writer) = stream.into_split();
                            let mut reader = BufReader::new(reader);
                            let proxy = event_loop_proxy.clone();

                            // Handle incoming messages
                            let read_handle = tokio::spawn(async move {
                                let mut line = String::new();
                                loop {
                                    line.clear();
                                    match reader.read_line(&mut line).await {
                                        Ok(0) => break, // EOF
                                        Ok(_) => {
                                            if let Err(e) = Self::handle_message(&line.trim(), &proxy) {
                                                tracing::warn!("Failed to handle message: {}", e);
                                            }
                                        }
                                        Err(e) => {
                                            tracing::error!("Read error: {}", e);
                                            break;
                                        }
                                    }
                                }
                            });

                            // Handle outgoing messages
                            while let Some(msg) = outgoing.recv().await {
                                match serde_json::to_string(&msg) {
                                    Ok(json) => {
                                        if let Err(e) = writer.write_all(format!("{}\n", json).as_bytes()).await {
                                            tracing::error!("Write error: {}", e);
                                            break;
                                        }
                                    }
                                    Err(e) => {
                                        tracing::error!("Serialization error: {}", e);
                                    }
                                }
                            }

                            read_handle.abort();
                            let _ = event_loop_proxy.send_event(UserEvent::SocketDisconnected);
                            tracing::info!("Client disconnected");
                        }
                        Err(e) => {
                            tracing::error!("Accept error: {}", e);
                        }
                    }
                }
            }
        }

        // Cleanup socket file
        let _ = std::fs::remove_file(socket_path);
        Ok(())
    }

    #[cfg(windows)]
    async fn run_server(
        socket_path: &str,
        mut outgoing: mpsc::UnboundedReceiver<OutgoingMessage>,
        event_loop_proxy: EventLoopProxy<UserEvent>,
        shutdown: Arc<Mutex<bool>>,
    ) -> anyhow::Result<()> {
        // Windows named pipe implementation
        // For now, use TCP as a fallback
        use tokio::net::TcpListener;

        // Parse port from socket path or use default
        let port: u16 = socket_path
            .split('-')
            .last()
            .and_then(|s| s.parse().ok())
            .unwrap_or(9876);

        let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
        tracing::info!("Socket server listening on 127.0.0.1:{}", port);

        loop {
            if *shutdown.lock() {
                break;
            }

            tokio::select! {
                accept_result = listener.accept() => {
                    match accept_result {
                        Ok((stream, _)) => {
                            tracing::info!("Client connected");
                            let _ = event_loop_proxy.send_event(UserEvent::SocketConnected);

                            let (reader, mut writer) = stream.into_split();
                            let mut reader = BufReader::new(reader);
                            let proxy = event_loop_proxy.clone();

                            // Handle incoming messages
                            let read_handle = tokio::spawn(async move {
                                let mut line = String::new();
                                loop {
                                    line.clear();
                                    match reader.read_line(&mut line).await {
                                        Ok(0) => break,
                                        Ok(_) => {
                                            if let Err(e) = Self::handle_message(&line.trim(), &proxy) {
                                                tracing::warn!("Failed to handle message: {}", e);
                                            }
                                        }
                                        Err(e) => {
                                            tracing::error!("Read error: {}", e);
                                            break;
                                        }
                                    }
                                }
                            });

                            // Handle outgoing messages
                            while let Some(msg) = outgoing.recv().await {
                                match serde_json::to_string(&msg) {
                                    Ok(json) => {
                                        if let Err(e) = writer.write_all(format!("{}\n", json).as_bytes()).await {
                                            tracing::error!("Write error: {}", e);
                                            break;
                                        }
                                    }
                                    Err(e) => {
                                        tracing::error!("Serialization error: {}", e);
                                    }
                                }
                            }

                            read_handle.abort();
                            let _ = event_loop_proxy.send_event(UserEvent::SocketDisconnected);
                            tracing::info!("Client disconnected");
                        }
                        Err(e) => {
                            tracing::error!("Accept error: {}", e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn handle_message(json: &str, proxy: &EventLoopProxy<UserEvent>) -> anyhow::Result<()> {
        let msg: IncomingMessage = serde_json::from_str(json)?;

        let event = match msg {
            IncomingMessage::JoinRoom { server_url, token } => {
                UserEvent::JoinRoom { server_url, token }
            }
            IncomingMessage::LeaveRoom => UserEvent::LeaveRoom,
            IncomingMessage::GetAvailableContent => UserEvent::GetAvailableContent,
            IncomingMessage::StartScreenShare {
                source_id,
                source_type,
                config,
            } => UserEvent::StartScreenShare(crate::ScreenShareMessage {
                source_id,
                source_type,
                config: config.unwrap_or_default(),
            }),
            IncomingMessage::StopScreenShare => UserEvent::StopScreenShare,
            IncomingMessage::SendAnnotation {
                stroke_id,
                tool,
                color,
                points,
            } => {
                // For local user's stroke, we need to:
                // 1. Publish to DataTrack (handled by room service)
                // 2. NOT render locally (annotations show on sharer's screen, not drawer's)
                // This is a command to publish, not to render
                if let Some(first_point) = points.first() {
                    UserEvent::StrokeStart {
                        stroke_id: stroke_id.clone(),
                        participant_id: "local".to_string(), // Will be replaced with actual ID
                        tool,
                        color,
                        start_point: *first_point,
                    }
                } else {
                    return Ok(()); // No points, nothing to do
                }
            }
            IncomingMessage::DeleteAnnotation { stroke_id } => {
                UserEvent::StrokeDelete { stroke_id }
            }
            IncomingMessage::ClearAnnotations => UserEvent::ClearAllAnnotations,
            IncomingMessage::CursorMove { x, y } => UserEvent::RemoteCursorPosition {
                participant_id: "local".to_string(),
                x,
                y,
                visible: true,
            },
            IncomingMessage::CursorHide => UserEvent::RemoteCursorPosition {
                participant_id: "local".to_string(),
                x: 0.0,
                y: 0.0,
                visible: false,
            },
            IncomingMessage::SetMicMuted { muted } => UserEvent::SetMicrophoneMuted(muted),
            IncomingMessage::SetCameraEnabled { enabled } => UserEvent::SetCameraEnabled(enabled),
            IncomingMessage::SetAudioInputDevice { device_id } => {
                UserEvent::SetAudioInputDevice(device_id)
            }
            IncomingMessage::SetVideoInputDevice { device_id } => {
                UserEvent::SetVideoInputDevice(device_id)
            }
            IncomingMessage::CheckPermissions => UserEvent::CheckPermissions,
            IncomingMessage::RequestScreenRecordingPermission => {
                UserEvent::RequestScreenRecordingPermission
            }
            IncomingMessage::Ping => {
                // Respond with pong - but we need the sender
                // For now, just acknowledge
                return Ok(());
            }
            IncomingMessage::Shutdown => UserEvent::Terminate,
        };

        proxy.send_event(event)?;
        Ok(())
    }
}
