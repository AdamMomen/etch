//! LiveKit room management module
//!
//! Handles connection to LiveKit server, track publishing/subscribing,
//! and DataTrack messaging for annotations and chat.

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

/// LiveKit room service
pub struct RoomService {
    event_proxy: EventLoopProxy<UserEvent>,
    room: Arc<Mutex<Option<Room>>>,
    screen_share_track: Arc<Mutex<Option<ScreenShareTrack>>>,
    /// Channel sender for stopping the event handler task
    _shutdown_tx: Option<mpsc::Sender<()>>,
}

impl RoomService {
    /// Connect to a LiveKit room
    pub async fn connect(
        server_url: &str,
        token: &str,
        event_proxy: EventLoopProxy<UserEvent>,
    ) -> anyhow::Result<Self> {
        tracing::info!("Connecting to LiveKit room: {}", server_url);

        // Connect to LiveKit room
        let (room, mut room_events) =
            Room::connect(server_url, token, RoomOptions::default()).await?;

        let room_name = room.name().to_string();
        let room_sid = room.sid().await;
        tracing::info!(
            "Connected to LiveKit room: {} ({})",
            room_name,
            String::from(room_sid)
        );

        // Clone for the event handler
        let event_proxy_clone = event_proxy.clone();

        // Create shutdown channel
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

        // Spawn event handler task
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    Some(event) = room_events.recv() => {
                        Self::handle_room_event(event, &event_proxy_clone);
                    }
                    _ = shutdown_rx.recv() => {
                        tracing::info!("Room event handler shutting down");
                        break;
                    }
                }
            }
        });

        // Send connected event
        let _ = event_proxy.send_event(UserEvent::RoomConnected {
            room_name: room_name.clone(),
        });

        Ok(Self {
            event_proxy,
            room: Arc::new(Mutex::new(Some(room))),
            screen_share_track: Arc::new(Mutex::new(None)),
            _shutdown_tx: Some(shutdown_tx),
        })
    }

    /// Handle LiveKit room events
    fn handle_room_event(event: RoomEvent, event_proxy: &EventLoopProxy<UserEvent>) {
        match event {
            RoomEvent::ParticipantConnected(participant) => {
                tracing::info!("Participant connected: {}", participant.identity());
                let _ = event_proxy.send_event(UserEvent::ParticipantConnected(
                    crate::ParticipantData {
                        id: participant.identity().to_string(),
                        name: participant.name().to_string(),
                        is_local: false,
                        role: crate::ParticipantRole::Participant, // Default role
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
            RoomEvent::TrackSubscribed {
                track,
                publication: _,
                participant,
            } => {
                tracing::info!(
                    "Track subscribed: {} from {}",
                    track.sid(),
                    participant.identity()
                );
                // Handle subscribed tracks (remote screen shares, cameras, etc.)
            }
            RoomEvent::TrackUnsubscribed {
                track,
                publication: _,
                participant,
            } => {
                tracing::info!(
                    "Track unsubscribed: {} from {}",
                    track.sid(),
                    participant.identity()
                );
            }
            RoomEvent::DataReceived {
                payload,
                topic: _,
                kind,
                participant,
            } => {
                // Handle incoming data (annotations, chat, etc.)
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

    /// Disconnect from the room
    pub async fn disconnect(&self) {
        tracing::info!("Disconnecting from LiveKit room");
        if let Some(room) = self.room.lock().take() {
            let _ = room.close().await;
        }
    }

    /// Create and publish a screen share track, returning the NativeVideoSource for capture
    pub async fn publish_screen_share(
        &self,
        width: u32,
        height: u32,
    ) -> anyhow::Result<NativeVideoSource> {
        let room_guard = self.room.lock();
        let room = room_guard
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Not connected to room"))?;

        tracing::info!(
            "Publishing screen share track at {}x{}",
            width,
            height
        );

        // Create video source
        let video_source = NativeVideoSource::new(VideoResolution { width, height });

        // Create video track
        let track = LocalVideoTrack::create_video_track(
            "screen_share",
            RtcVideoSource::Native(video_source.clone()),
        );

        // Publish the track
        let publication = room
            .local_participant()
            .publish_track(
                LocalTrack::Video(track),
                TrackPublishOptions {
                    source: TrackSource::Screenshare,
                    video_codec: VideoCodec::VP9,
                    video_encoding: Some(VideoEncoding {
                        max_bitrate: 4_000_000, // 4 Mbps
                        max_framerate: 30.0,
                    }),
                    simulcast: false,
                    ..Default::default()
                },
            )
            .await?;

        tracing::info!("Screen share track published: {}", publication.sid());

        // Store track info
        let screen_share = ScreenShareTrack {
            video_source: video_source.clone(),
            publication,
        };
        *self.screen_share_track.lock() = Some(screen_share);

        // Notify WebView
        let _ = self.event_proxy.send_event(UserEvent::ScreenSharePublished);

        Ok(video_source)
    }

    /// Get the video source for the current screen share (if any)
    pub fn get_screen_share_source(&self) -> Option<NativeVideoSource> {
        self.screen_share_track
            .lock()
            .as_ref()
            .map(|t| t.video_source.clone())
    }

    /// Unpublish screen share track
    pub async fn unpublish_screen_share(&self) -> anyhow::Result<()> {
        let track_info = self.screen_share_track.lock().take();
        if let Some(track) = track_info {
            let room_guard = self.room.lock();
            if let Some(room) = room_guard.as_ref() {
                room.local_participant()
                    .unpublish_track(&track.publication.sid())
                    .await?;
                tracing::info!("Screen share track unpublished");
            }
        }
        Ok(())
    }

    /// Set microphone muted state
    /// Note: This requires manually publishing/unpublishing the audio track
    /// For now, we log the intent - full implementation needs track management
    pub fn set_microphone_muted(&self, muted: bool) {
        tracing::debug!("Set microphone muted: {} (track management TBD)", muted);
        // TODO: Implement track-based muting when audio track is published
    }

    /// Set camera enabled state
    /// Note: This requires manually publishing/unpublishing the video track
    pub fn set_camera_enabled(&self, enabled: bool) {
        tracing::debug!("Set camera enabled: {} (track management TBD)", enabled);
        // TODO: Implement track-based camera control when camera track is published
    }

    /// Set audio input device
    pub fn set_audio_input_device(&self, device_id: &str) {
        tracing::debug!("Set audio input device: {} (TBD)", device_id);
        // TODO: Implement when audio devices are supported
    }

    /// Set video input device
    pub fn set_video_input_device(&self, device_id: &str) {
        tracing::debug!("Set video input device: {} (TBD)", device_id);
        // TODO: Implement when video devices are supported
    }

    /// Send data via DataTrack
    pub async fn send_data(&self, data: Vec<u8>, reliable: bool) -> anyhow::Result<()> {
        let room_guard = self.room.lock();
        if let Some(room) = room_guard.as_ref() {
            room.local_participant()
                .publish_data(DataPacket {
                    payload: data.into(),
                    reliable,
                    ..Default::default()
                })
                .await?;
            tracing::debug!("Data sent");
        }
        Ok(())
    }

    /// Send data to specific participants
    pub async fn send_data_to(
        &self,
        data: Vec<u8>,
        participant_ids: Vec<String>,
        reliable: bool,
    ) -> anyhow::Result<()> {
        let room_guard = self.room.lock();
        if let Some(room) = room_guard.as_ref() {
            let identities: Vec<ParticipantIdentity> = participant_ids
                .into_iter()
                .map(ParticipantIdentity::from)
                .collect();
            room.local_participant()
                .publish_data(DataPacket {
                    payload: data.into(),
                    reliable,
                    destination_identities: identities,
                    ..Default::default()
                })
                .await?;
        }
        Ok(())
    }

    /// Get local participant identity
    pub fn local_identity(&self) -> Option<String> {
        self.room
            .lock()
            .as_ref()
            .map(|r| r.local_participant().identity().to_string())
    }

    /// Get list of remote participants
    pub fn remote_participants(&self) -> Vec<(String, String)> {
        self.room
            .lock()
            .as_ref()
            .map(|r| {
                r.remote_participants()
                    .iter()
                    .map(|(_, p)| (p.identity().to_string(), p.name().to_string()))
                    .collect()
            })
            .unwrap_or_default()
    }
}
