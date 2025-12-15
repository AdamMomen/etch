//! Tests for socket protocol parsing
//!
//! These tests verify that IncomingMessage and OutgoingMessage types
//! serialize/deserialize correctly according to the socket protocol specification.

use nameless_core::socket::{IncomingMessage, OutgoingMessage};
use nameless_core::{
    AnnotationTool, ConnectionState, FrameFormat, ParticipantData,
    ParticipantRole, PermissionState, PermissionStatus, ScreenInfo, SourceType, WindowInfo,
};

// ============================================================================
// IncomingMessage Tests (WebView → Core)
// ============================================================================

#[test]
fn test_parse_join_room() {
    let json = r#"{"type":"join_room","server_url":"wss://livekit.example.com","token":"eyJ..."}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::JoinRoom { server_url, token } => {
            assert_eq!(server_url, "wss://livekit.example.com");
            assert_eq!(token, "eyJ...");
        }
        _ => panic!("Expected JoinRoom"),
    }
}

#[test]
fn test_parse_leave_room() {
    let json = r#"{"type":"leave_room"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::LeaveRoom));
}

#[test]
fn test_parse_get_available_content() {
    let json = r#"{"type":"get_available_content"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::GetAvailableContent));
}

#[test]
fn test_parse_start_screen_share() {
    let json = r#"{"type":"start_screen_share","source_id":"screen-0","source_type":"screen","config":{"width":1920,"height":1080,"framerate":60,"bitrate":6000000}}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::StartScreenShare {
            source_id,
            source_type,
            config,
        } => {
            assert_eq!(source_id, "screen-0");
            assert_eq!(source_type, SourceType::Screen);
            let config = config.unwrap();
            assert_eq!(config.width, 1920);
            assert_eq!(config.height, 1080);
            assert_eq!(config.framerate, 60);
            assert_eq!(config.bitrate, 6000000);
        }
        _ => panic!("Expected StartScreenShare"),
    }
}

#[test]
fn test_parse_start_screen_share_window_type() {
    let json = r#"{"type":"start_screen_share","source_id":"window-123","source_type":"window"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::StartScreenShare {
            source_id,
            source_type,
            config,
        } => {
            assert_eq!(source_id, "window-123");
            assert_eq!(source_type, SourceType::Window);
            assert!(config.is_none());
        }
        _ => panic!("Expected StartScreenShare"),
    }
}

#[test]
fn test_parse_stop_screen_share() {
    let json = r#"{"type":"stop_screen_share"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::StopScreenShare));
}

#[test]
fn test_parse_send_annotation() {
    let json = r#"{"type":"send_annotation","stroke_id":"stroke-123","tool":"pen","color":{"r":255,"g":0,"b":0,"a":255},"points":[{"x":0.1,"y":0.2,"pressure":0.5},{"x":0.3,"y":0.4}]}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::SendAnnotation {
            stroke_id,
            tool,
            color,
            points,
        } => {
            assert_eq!(stroke_id, "stroke-123");
            assert_eq!(tool, AnnotationTool::Pen);
            assert_eq!(color.r, 255);
            assert_eq!(color.g, 0);
            assert_eq!(color.b, 0);
            assert_eq!(color.a, 255);
            assert_eq!(points.len(), 2);
            assert!((points[0].x - 0.1).abs() < 0.001);
            assert!((points[0].y - 0.2).abs() < 0.001);
            assert!((points[0].pressure - 0.5).abs() < 0.001);
        }
        _ => panic!("Expected SendAnnotation"),
    }
}

#[test]
fn test_parse_annotation_highlighter_tool() {
    let json = r#"{"type":"send_annotation","stroke_id":"stroke-456","tool":"highlighter","color":{"r":255,"g":255,"b":0,"a":128},"points":[{"x":0.5,"y":0.5}]}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::SendAnnotation { tool, color, .. } => {
            assert_eq!(tool, AnnotationTool::Highlighter);
            assert_eq!(color.a, 128); // Semi-transparent
        }
        _ => panic!("Expected SendAnnotation"),
    }
}

#[test]
fn test_parse_delete_annotation() {
    let json = r#"{"type":"delete_annotation","stroke_id":"stroke-123"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::DeleteAnnotation { stroke_id } => {
            assert_eq!(stroke_id, "stroke-123");
        }
        _ => panic!("Expected DeleteAnnotation"),
    }
}

#[test]
fn test_parse_clear_annotations() {
    let json = r#"{"type":"clear_annotations"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::ClearAnnotations));
}

#[test]
fn test_parse_cursor_move() {
    let json = r#"{"type":"cursor_move","x":0.5,"y":0.75}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::CursorMove { x, y } => {
            assert!((x - 0.5).abs() < 0.001);
            assert!((y - 0.75).abs() < 0.001);
        }
        _ => panic!("Expected CursorMove"),
    }
}

#[test]
fn test_parse_cursor_hide() {
    let json = r#"{"type":"cursor_hide"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::CursorHide));
}

#[test]
fn test_parse_set_mic_muted() {
    let json = r#"{"type":"set_mic_muted","muted":true}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::SetMicMuted { muted } => {
            assert!(muted);
        }
        _ => panic!("Expected SetMicMuted"),
    }
}

#[test]
fn test_parse_set_camera_enabled() {
    let json = r#"{"type":"set_camera_enabled","enabled":false}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    match msg {
        IncomingMessage::SetCameraEnabled { enabled } => {
            assert!(!enabled);
        }
        _ => panic!("Expected SetCameraEnabled"),
    }
}

#[test]
fn test_parse_check_permissions() {
    let json = r#"{"type":"check_permissions"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::CheckPermissions));
}

#[test]
fn test_parse_request_screen_recording_permission() {
    let json = r#"{"type":"request_screen_recording_permission"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(
        msg,
        IncomingMessage::RequestScreenRecordingPermission
    ));
}

#[test]
fn test_parse_ping() {
    let json = r#"{"type":"ping"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::Ping));
}

#[test]
fn test_parse_shutdown() {
    let json = r#"{"type":"shutdown"}"#;
    let msg: IncomingMessage = serde_json::from_str(json).unwrap();

    assert!(matches!(msg, IncomingMessage::Shutdown));
}

// ============================================================================
// OutgoingMessage Tests (Core → WebView)
// ============================================================================

#[test]
fn test_serialize_available_content() {
    let msg = OutgoingMessage::AvailableContent {
        screens: vec![ScreenInfo {
            id: "screen-0".to_string(),
            name: "Primary Display".to_string(),
            width: 1920,
            height: 1080,
            is_primary: true,
        }],
        windows: vec![WindowInfo {
            id: "window-123".to_string(),
            title: "VS Code".to_string(),
            app_name: "Code".to_string(),
            width: 1200,
            height: 800,
        }],
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"available_content\""));
    assert!(json.contains("\"screens\""));
    assert!(json.contains("\"windows\""));
    assert!(json.contains("\"is_primary\":true"));
}

#[test]
fn test_serialize_participant_joined() {
    let msg = OutgoingMessage::ParticipantJoined {
        participant: ParticipantData {
            id: "participant-123".to_string(),
            name: "Alice".to_string(),
            is_local: false,
            role: ParticipantRole::Participant,
        },
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"participant_joined\""));
    assert!(json.contains("\"id\":\"participant-123\""));
    assert!(json.contains("\"name\":\"Alice\""));
}

#[test]
fn test_serialize_participant_left() {
    let msg = OutgoingMessage::ParticipantLeft {
        participant_id: "participant-456".to_string(),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"participant_left\""));
    assert!(json.contains("\"participant_id\":\"participant-456\""));
}

#[test]
fn test_serialize_connection_state_changed() {
    let msg = OutgoingMessage::ConnectionStateChanged {
        state: ConnectionState::Connected,
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"connection_state_changed\""));
    assert!(json.contains("\"state\":\"connected\""));
}

#[test]
fn test_serialize_screen_share_started() {
    let msg = OutgoingMessage::ScreenShareStarted {
        sharer_id: "participant-123".to_string(),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"screen_share_started\""));
    assert!(json.contains("\"sharer_id\":\"participant-123\""));
}

#[test]
fn test_serialize_screen_share_stopped() {
    let msg = OutgoingMessage::ScreenShareStopped;

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"screen_share_stopped\""));
}

#[test]
fn test_serialize_video_frame() {
    let msg = OutgoingMessage::VideoFrame {
        participant_id: "participant-123".to_string(),
        track_id: "track-456".to_string(),
        width: 1920,
        height: 1080,
        timestamp: 1234567890,
        format: FrameFormat::Jpeg,
        frame_data: vec![0xFF, 0xD8, 0xFF], // JPEG header
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"video_frame\""));
    assert!(json.contains("\"width\":1920"));
    assert!(json.contains("\"height\":1080"));
    assert!(json.contains("\"format\":\"jpeg\""));
    // frame_data should be base64 encoded
    assert!(json.contains("\"frame_data\":"));
}

#[test]
fn test_serialize_permission_state() {
    let msg = OutgoingMessage::PermissionState {
        state: PermissionState {
            screen_recording: PermissionStatus::Granted,
            microphone: PermissionStatus::Granted,
            camera: PermissionStatus::NotDetermined,
            accessibility: PermissionStatus::NotApplicable,
        },
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"permission_state\""));
    assert!(json.contains("\"screen_recording\":\"granted\""));
    assert!(json.contains("\"camera\":\"not_determined\""));
}

#[test]
fn test_serialize_pong() {
    let msg = OutgoingMessage::Pong;

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"pong\""));
}

#[test]
fn test_serialize_error() {
    let msg = OutgoingMessage::Error {
        code: "ROOM_CONNECTION_FAILED".to_string(),
        message: "Failed to connect to room: timeout".to_string(),
    };

    let json = serde_json::to_string(&msg).unwrap();
    assert!(json.contains("\"type\":\"error\""));
    assert!(json.contains("\"code\":\"ROOM_CONNECTION_FAILED\""));
    assert!(json.contains("\"message\":\"Failed to connect to room: timeout\""));
}

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_parse_invalid_message_type() {
    let json = r#"{"type":"invalid_type"}"#;
    let result: Result<IncomingMessage, _> = serde_json::from_str(json);

    assert!(result.is_err());
}

#[test]
fn test_parse_missing_required_field() {
    // Missing token field in join_room
    let json = r#"{"type":"join_room","server_url":"wss://livekit.example.com"}"#;
    let result: Result<IncomingMessage, _> = serde_json::from_str(json);

    assert!(result.is_err());
}

#[test]
fn test_parse_invalid_source_type() {
    let json = r#"{"type":"start_screen_share","source_id":"screen-0","source_type":"invalid"}"#;
    let result: Result<IncomingMessage, _> = serde_json::from_str(json);

    assert!(result.is_err());
}

#[test]
fn test_parse_empty_json() {
    let json = r#"{}"#;
    let result: Result<IncomingMessage, _> = serde_json::from_str(json);

    assert!(result.is_err());
}

#[test]
fn test_parse_malformed_json() {
    let json = r#"{"type": "join_room""#;
    let result: Result<IncomingMessage, _> = serde_json::from_str(json);

    assert!(result.is_err());
}
