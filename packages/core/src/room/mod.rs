//! LiveKit room management module
//!
//! Handles connection to LiveKit server, track publishing/subscribing,
//! and DataTrack messaging for annotations and chat.
//!
//! Uses runtime.block_on() pattern (like Hopp) to ensure WebRTC operations
//! are properly driven by a dedicated tokio runtime.

use std::sync::Arc;

use livekit::options::{TrackPublishOptions, VideoCodec, VideoEncoding};
use livekit::prelude::*;
use livekit::publication::LocalTrackPublication;
use livekit::track::{LocalTrack, LocalVideoTrack, TrackSource};
use livekit::webrtc::prelude::{RtcVideoSource, VideoResolution};
use livekit::webrtc::video_source::native::NativeVideoSource;
use parking_lot::Mutex;
use tokio::sync::mpsc;
use winit::event_loop::EventLoopProxy;

use crate::UserEvent;

/// Published screen share track info
pub struct ScreenShareTrack {
    pub video_source: NativeVideoSource,
    #[allow(dead_code)]
    publication: LocalTrackPublication,
}

/// LiveKit room service with dedicated tokio runtime
///
/// Following Hopp's pattern: uses runtime.block_on() for synchronous API
/// to ensure WebRTC async operations are properly driven.
pub struct RoomService {
    /// Dedicated async runtime (kept alive for the lifetime of RoomService)
    runtime: Arc<tokio::runtime::Runtime>,
    /// LiveKit server URL
    server_url: String,
    /// Event proxy for winit event loop
    event_proxy: EventLoopProxy<UserEvent>,
    /// Connected room (if any)
    room: Arc<Mutex<Option<Room>>>,
    /// Screen share track (if any)
    screen_share_track: Arc<Mutex<Option<ScreenShareTrack>>>,
}

impl RoomService {
    /// Create a new RoomService with its own tokio runtime
    pub fn new(
        server_url: String,
        event_proxy: EventLoopProxy<UserEvent>,
    ) -> std::io::Result<Self> {
        eprintln!("[DEBUG] RoomService::new - creating runtime");

        // Create dedicated tokio runtime (like Hopp)
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .thread_name("livekit-runtime")
            .build()?;

        eprintln!("[DEBUG] RoomService::new - runtime created");

        Ok(Self {
            runtime: Arc::new(runtime),
            server_url,
            event_proxy,
            room: Arc::new(Mutex::new(None)),
            screen_share_track: Arc::new(Mutex::new(None)),
        })
    }

    /// Connect to the LiveKit room (blocking)
    pub fn connect(&self, token: String) -> Result<(), String> {
        eprintln!("[DEBUG] RoomService::connect - starting");
        eprintln!("[DEBUG] Token length: {} chars", token.len());
        eprintln!("[DEBUG] Token preview: {}...{}", &token[..50.min(token.len())], &token[token.len().saturating_sub(20)..]);

        let server_url = self.server_url.clone();
        let event_proxy = self.event_proxy.clone();
        let room_holder = self.room.clone();

        // Use runtime.block_on() to drive the async operation
        // This ensures the WebRTC connection is properly polled
        eprintln!("[DEBUG] RoomService::connect - calling runtime.block_on()");

        let result = self.runtime.block_on(async move {
            eprintln!("[DEBUG] Inside block_on - calling Room::connect to {}", server_url);

            // Close existing room if any
            {
                let mut room_guard = room_holder.lock();
                if let Some(room) = room_guard.take() {
                    eprintln!("[DEBUG] Closing existing room");
                    let _ = room.close().await;
                }
            }

            // Connect with timeout - increased to 45s for cloud connections
            eprintln!("[DEBUG] Starting Room::connect with 45s timeout...");
            let connect_future = Room::connect(&server_url, &token, RoomOptions::default());

            match tokio::time::timeout(std::time::Duration::from_secs(45), connect_future).await {
                Ok(Ok((room, room_events))) => {
                    let room_name = room.name().to_string();
                    eprintln!("[DEBUG] SUCCESS: Connected to room: {}", room_name);

                    // Store room
                    *room_holder.lock() = Some(room);
                    eprintln!("[DEBUG] Room stored in holder");

                    // Notify winit event loop
                    let _ = event_proxy.send_event(UserEvent::RoomConnected { room_name });

                    // Return the event receiver for spawning the handler
                    Ok(room_events)
                }
                Ok(Err(e)) => {
                    eprintln!("[DEBUG] Room::connect FAILED: {:?}", e);
                    eprintln!("[DEBUG] Error details: {}", e);
                    Err(e.to_string())
                }
                Err(_) => {
                    eprintln!("[DEBUG] Room::connect TIMED OUT after 45s");
                    eprintln!("[DEBUG] This usually indicates WebSocket or ICE connectivity issues");
                    Err("Connection timed out after 45s".to_string())
                }
            }
        });

        // If connection succeeded, spawn event handler on the runtime
        match result {
            Ok(room_events) => {
                eprintln!("[DEBUG] Connection succeeded, spawning event handler");
                let event_proxy = self.event_proxy.clone();
                self.runtime.spawn(handle_room_events(room_events, event_proxy));
                eprintln!("[DEBUG] Event handler spawned");
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    /// Disconnect from the room
    pub fn disconnect(&self) {
        tracing::info!("RoomService::disconnect");

        // Take room out of mutex before spawning async task
        let room_to_close = self.room.lock().take();
        let event_proxy = self.event_proxy.clone();

        if let Some(room) = room_to_close {
            // Fire and forget - spawn the disconnect operation
            self.runtime.spawn(async move {
                let _ = room.close().await;
                tracing::info!("Room disconnected");
                let _ = event_proxy.send_event(UserEvent::RoomDisconnected);
            });
        }
    }

    /// Publish screen share track (blocking), returns the video source
    pub fn publish_screen_share(&self, width: u32, height: u32) -> Result<NativeVideoSource, String> {
        tracing::info!("RoomService::publish_screen_share {}x{}", width, height);

        let room_holder = self.room.clone();
        let screen_share_holder = self.screen_share_track.clone();
        let event_proxy = self.event_proxy.clone();

        self.runtime.block_on(async move {
            let room_guard = room_holder.lock();

            if let Some(room) = room_guard.as_ref() {
                tracing::info!("Publishing screen share track {}x{}", width, height);

                // Create video source
                let video_source = NativeVideoSource::new(VideoResolution { width, height });

                // Create video track
                let track = LocalVideoTrack::create_video_track(
                    "screen_share",
                    RtcVideoSource::Native(video_source.clone()),
                );

                // Publish the track
                match room
                    .local_participant()
                    .publish_track(
                        LocalTrack::Video(track),
                        TrackPublishOptions {
                            source: TrackSource::Screenshare,
                            video_codec: VideoCodec::VP9,
                            video_encoding: Some(VideoEncoding {
                                max_bitrate: 4_000_000,
                                max_framerate: 30.0,
                            }),
                            simulcast: false,
                            ..Default::default()
                        },
                    )
                    .await
                {
                    Ok(publication) => {
                        tracing::info!("Screen share track published: {}", publication.sid());

                        // Store track info
                        let screen_share = ScreenShareTrack {
                            video_source: video_source.clone(),
                            publication,
                        };
                        *screen_share_holder.lock() = Some(screen_share);

                        let _ = event_proxy.send_event(UserEvent::ScreenSharePublished);
                        Ok(video_source)
                    }
                    Err(e) => {
                        tracing::error!("Failed to publish screen share: {}", e);
                        Err(e.to_string())
                    }
                }
            } else {
                Err("Not connected to room".to_string())
            }
        })
    }

    /// Get the video source for the current screen share (if any)
    pub fn get_screen_share_source(&self) -> Option<NativeVideoSource> {
        self.screen_share_track
            .lock()
            .as_ref()
            .map(|t| t.video_source.clone())
    }

    /// Unpublish screen share track
    pub fn unpublish_screen_share(&self) -> Result<(), String> {
        tracing::info!("RoomService::unpublish_screen_share");

        let room_holder = self.room.clone();
        let screen_share_holder = self.screen_share_track.clone();

        self.runtime.block_on(async move {
            let track_info = screen_share_holder.lock().take();

            if let Some(track) = track_info {
                let room_guard = room_holder.lock();
                if let Some(room) = room_guard.as_ref() {
                    let _ = room
                        .local_participant()
                        .unpublish_track(&track.publication.sid())
                        .await;
                    tracing::info!("Screen share track unpublished");
                }
            }
            Ok(())
        })
    }

    /// Send data via DataTrack (blocking)
    pub fn send_data(&self, data: Vec<u8>, reliable: bool) {
        let room_holder = self.room.clone();

        // Use block_on to ensure data is sent (Room doesn't implement Clone)
        self.runtime.block_on(async move {
            let room_guard = room_holder.lock();
            if let Some(room) = room_guard.as_ref() {
                let _ = room
                    .local_participant()
                    .publish_data(DataPacket {
                        payload: data.into(),
                        reliable,
                        ..Default::default()
                    })
                    .await;
            }
        });
    }

    /// Set microphone muted state (placeholder)
    pub fn set_microphone_muted(&self, muted: bool) {
        tracing::debug!("Set microphone muted: {} (track management TBD)", muted);
    }

    /// Set camera enabled state (placeholder)
    pub fn set_camera_enabled(&self, enabled: bool) {
        tracing::debug!("Set camera enabled: {} (track management TBD)", enabled);
    }

    /// Set audio input device (placeholder)
    pub fn set_audio_input_device(&self, device_id: &str) {
        tracing::debug!("Set audio input device: {} (TBD)", device_id);
    }

    /// Set video input device (placeholder)
    pub fn set_video_input_device(&self, device_id: &str) {
        tracing::debug!("Set video input device: {} (TBD)", device_id);
    }
}

/// Handle LiveKit room events
async fn handle_room_events(
    mut events: mpsc::UnboundedReceiver<RoomEvent>,
    event_proxy: EventLoopProxy<UserEvent>,
) {
    eprintln!("[DEBUG] Room event handler started");

    while let Some(event) = events.recv().await {
        match event {
            RoomEvent::ParticipantConnected(participant) => {
                tracing::info!("Participant connected: {}", participant.identity());
                let _ = event_proxy.send_event(UserEvent::ParticipantConnected(
                    crate::ParticipantData {
                        id: participant.identity().to_string(),
                        name: participant.name().to_string(),
                        is_local: false,
                        role: crate::ParticipantRole::Participant,
                    },
                ));
            }
            RoomEvent::ParticipantDisconnected(participant) => {
                tracing::info!("Participant disconnected: {}", participant.identity());
                let _ = event_proxy.send_event(UserEvent::ParticipantDisconnected(
                    crate::ParticipantData {
                        id: participant.identity().to_string(),
                        name: participant.name().to_string(),
                        is_local: false,
                        role: crate::ParticipantRole::Participant,
                    },
                ));
            }
            RoomEvent::TrackSubscribed { track, participant, .. } => {
                tracing::info!("Track subscribed: {} from {}", track.sid(), participant.identity());
            }
            RoomEvent::TrackUnsubscribed { track, participant, .. } => {
                tracing::info!("Track unsubscribed: {} from {}", track.sid(), participant.identity());
            }
            RoomEvent::DataReceived { payload, kind, participant, .. } => {
                if let Some(p) = participant {
                    tracing::debug!(
                        "Data received from {}: {} bytes, reliable: {}",
                        p.identity(),
                        payload.len(),
                        kind == DataPacketKind::Reliable
                    );
                    let _ = event_proxy.send_event(UserEvent::DataReceived {
                        payload: payload.to_vec(),
                        participant_id: p.identity().to_string(),
                    });
                }
            }
            RoomEvent::Disconnected { reason } => {
                tracing::warn!("Room disconnected: {:?}", reason);
                let _ = event_proxy.send_event(UserEvent::RoomDisconnected);
            }
            RoomEvent::Reconnecting => {
                tracing::info!("Room reconnecting...");
            }
            RoomEvent::Reconnected => {
                tracing::info!("Room reconnected");
            }
            _ => {
                tracing::trace!("Room event: {:?}", event);
            }
        }
    }
    tracing::info!("Room event handler exited");
}
