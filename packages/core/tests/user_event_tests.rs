//! Tests for UserEvent handling
//!
//! These tests verify that the socket message handling correctly
//! translates IncomingMessages to UserEvents.

use etch_core::{
    AnnotationTool, CaptureConfig, Color, SourceType, UserEvent,
};

// Note: The socket::handle_message function is private, so we can't test it directly.
// These tests verify the UserEvent enum structure and associated types.

#[test]
fn test_user_event_screen_share_message_default_config() {
    let default = CaptureConfig::default();

    assert_eq!(default.width, 1920);
    assert_eq!(default.height, 1080);
    assert_eq!(default.framerate, 60);
    assert_eq!(default.bitrate, 6_000_000); // 6 Mbps
}

#[test]
fn test_user_event_source_types() {
    // Verify SourceType enum variants exist and compare correctly
    let screen = SourceType::Screen;
    let window = SourceType::Window;

    assert_eq!(screen, SourceType::Screen);
    assert_eq!(window, SourceType::Window);
    assert_ne!(screen, window);
}

#[test]
fn test_user_event_annotation_tools() {
    // Verify AnnotationTool enum variants exist and compare correctly
    let pen = AnnotationTool::Pen;
    let highlighter = AnnotationTool::Highlighter;
    let eraser = AnnotationTool::Eraser;

    assert_eq!(pen, AnnotationTool::Pen);
    assert_eq!(highlighter, AnnotationTool::Highlighter);
    assert_eq!(eraser, AnnotationTool::Eraser);

    assert_ne!(pen, highlighter);
    assert_ne!(pen, eraser);
    assert_ne!(highlighter, eraser);
}

#[test]
fn test_user_event_color_constants() {
    // Verify color constants are defined
    assert_eq!(Color::RED.a, 255);
    assert_eq!(Color::BLUE.a, 255);
    assert_eq!(Color::GREEN.a, 255);

    // Palette has 6 colors
    assert_eq!(Color::PALETTE.len(), 6);
}

#[test]
fn test_user_event_variants_exist() {
    // This test verifies the key UserEvent variants exist by pattern matching
    // Creating actual instances would require more setup

    fn match_event(event: &UserEvent) -> &'static str {
        match event {
            UserEvent::GetAvailableContent => "get_content",
            UserEvent::StartScreenShare(_) => "start_share",
            UserEvent::StopScreenShare => "stop_share",
            UserEvent::JoinRoom { .. } => "join_room",
            UserEvent::LeaveRoom => "leave_room",
            UserEvent::Terminate => "terminate",
            UserEvent::CheckPermissions => "check_perms",
            UserEvent::RequestScreenRecordingPermission => "request_perm",
            UserEvent::StrokeStart { .. } => "stroke_start",
            UserEvent::StrokeUpdate { .. } => "stroke_update",
            UserEvent::StrokeComplete { .. } => "stroke_complete",
            UserEvent::StrokeDelete { .. } => "stroke_delete",
            UserEvent::ClearAllAnnotations => "clear_annotations",
            UserEvent::SetMicrophoneMuted(_) => "mic_muted",
            UserEvent::SetCameraEnabled(_) => "camera_enabled",
            _ => "other",
        }
    }

    // Test a few key variants
    assert_eq!(match_event(&UserEvent::GetAvailableContent), "get_content");
    assert_eq!(match_event(&UserEvent::StopScreenShare), "stop_share");
    assert_eq!(match_event(&UserEvent::LeaveRoom), "leave_room");
    assert_eq!(match_event(&UserEvent::Terminate), "terminate");
    assert_eq!(match_event(&UserEvent::CheckPermissions), "check_perms");
}

#[test]
fn test_screen_share_message_creation() {
    use etch_core::ScreenShareMessage;

    let msg = ScreenShareMessage {
        source_id: "screen-0".to_string(),
        source_type: SourceType::Screen,
        config: CaptureConfig {
            width: 2560,
            height: 1440,
            framerate: 60,
            bitrate: 8_000_000,
        },
    };

    assert_eq!(msg.source_id, "screen-0");
    assert_eq!(msg.source_type, SourceType::Screen);
    assert_eq!(msg.config.width, 2560);
    assert_eq!(msg.config.height, 1440);
}

#[test]
fn test_connection_state_variants() {
    use etch_core::ConnectionState;

    let states = [
        ConnectionState::Disconnected,
        ConnectionState::Connecting,
        ConnectionState::Connected,
        ConnectionState::Reconnecting,
    ];

    // Verify all states are distinct
    for (i, state1) in states.iter().enumerate() {
        for (j, state2) in states.iter().enumerate() {
            if i == j {
                assert_eq!(state1, state2);
            } else {
                assert_ne!(state1, state2);
            }
        }
    }
}

#[test]
fn test_frame_format_variants() {
    use etch_core::FrameFormat;

    let formats = [
        FrameFormat::Jpeg,
        FrameFormat::Rgba,
        FrameFormat::Nv12,
    ];

    // Verify all formats are distinct
    assert_ne!(formats[0], formats[1]);
    assert_ne!(formats[1], formats[2]);
    assert_ne!(formats[0], formats[2]);
}

#[test]
fn test_cursor_style_variants() {
    use etch_core::CursorStyle;

    let styles = [
        CursorStyle::Default,
        CursorStyle::Pen,
        CursorStyle::Highlighter,
        CursorStyle::Eraser,
        CursorStyle::Hidden,
    ];

    // Verify all 5 styles exist and Default is the expected first value
    assert_eq!(styles[0], CursorStyle::Default);
    assert_eq!(styles.len(), 5);
}

#[test]
fn test_participant_role_variants() {
    use etch_core::ParticipantRole;

    let host = ParticipantRole::Host;
    let participant = ParticipantRole::Participant;

    assert_eq!(host, ParticipantRole::Host);
    assert_eq!(participant, ParticipantRole::Participant);
    assert_ne!(host, participant);
}

#[test]
fn test_permission_status_variants() {
    use etch_core::PermissionStatus;

    let statuses = [
        PermissionStatus::Granted,
        PermissionStatus::Denied,
        PermissionStatus::NotDetermined,
        PermissionStatus::Restricted,
        PermissionStatus::NotApplicable,
    ];

    // Verify all 5 statuses are distinct
    assert_eq!(statuses.len(), 5);
    for (i, s1) in statuses.iter().enumerate() {
        for (j, s2) in statuses.iter().enumerate() {
            if i != j {
                assert_ne!(s1, s2, "Status {} and {} should be different", i, j);
            }
        }
    }
}

#[test]
fn test_point_default_pressure() {
    use etch_core::Point;

    // Deserialize a point without pressure - should default to 1.0
    let json = r#"{"x": 0.5, "y": 0.75}"#;
    let point: Point = serde_json::from_str(json).unwrap();

    assert!((point.x - 0.5).abs() < 0.001);
    assert!((point.y - 0.75).abs() < 0.001);
    assert!((point.pressure - 1.0).abs() < 0.001); // Default pressure
}

#[test]
fn test_point_with_pressure() {
    use etch_core::Point;

    // Deserialize a point with explicit pressure
    let json = r#"{"x": 0.5, "y": 0.75, "pressure": 0.5}"#;
    let point: Point = serde_json::from_str(json).unwrap();

    assert!((point.x - 0.5).abs() < 0.001);
    assert!((point.y - 0.75).abs() < 0.001);
    assert!((point.pressure - 0.5).abs() < 0.001);
}

// ============================================================================
// Thumbnail tests (Story 3-12)
// ============================================================================

#[test]
fn test_screen_info_thumbnail_field() {
    use etch_core::ScreenInfo;

    // ScreenInfo with thumbnail
    let screen_with_thumb = ScreenInfo {
        id: "screen:1".to_string(),
        name: "Display 1".to_string(),
        width: 1920,
        height: 1080,
        is_primary: true,
        thumbnail: Some("base64encodeddata".to_string()),
    };

    assert_eq!(screen_with_thumb.thumbnail, Some("base64encodeddata".to_string()));

    // ScreenInfo without thumbnail
    let screen_without_thumb = ScreenInfo {
        id: "screen:2".to_string(),
        name: "Display 2".to_string(),
        width: 2560,
        height: 1440,
        is_primary: false,
        thumbnail: None,
    };

    assert_eq!(screen_without_thumb.thumbnail, None);
}

// Note: WindowInfo tests removed - window capture is not supported

#[test]
fn test_screen_info_serialization_with_thumbnail() {
    use etch_core::ScreenInfo;

    let screen = ScreenInfo {
        id: "screen:1".to_string(),
        name: "Display 1".to_string(),
        width: 1920,
        height: 1080,
        is_primary: true,
        thumbnail: Some("thumb_data".to_string()),
    };

    let json = serde_json::to_string(&screen).unwrap();

    // Verify JSON contains thumbnail
    assert!(json.contains("\"thumbnail\":\"thumb_data\""));
    assert!(json.contains("\"id\":\"screen:1\""));
    assert!(json.contains("\"name\":\"Display 1\""));
}

#[test]
fn test_screen_info_serialization_without_thumbnail() {
    use etch_core::ScreenInfo;

    let screen = ScreenInfo {
        id: "screen:1".to_string(),
        name: "Display 1".to_string(),
        width: 1920,
        height: 1080,
        is_primary: true,
        thumbnail: None,
    };

    let json = serde_json::to_string(&screen).unwrap();

    // Verify JSON does NOT contain thumbnail (skip_serializing_if = "Option::is_none")
    assert!(!json.contains("thumbnail"));
    assert!(json.contains("\"id\":\"screen:1\""));
}


#[test]
fn test_screen_info_deserialization_with_thumbnail() {
    use etch_core::ScreenInfo;

    let json = r#"{
        "id": "screen:1",
        "name": "Display 1",
        "width": 1920,
        "height": 1080,
        "is_primary": true,
        "thumbnail": "deserialize_test"
    }"#;

    let screen: ScreenInfo = serde_json::from_str(json).unwrap();

    assert_eq!(screen.id, "screen:1");
    assert_eq!(screen.thumbnail, Some("deserialize_test".to_string()));
}

#[test]
fn test_screen_info_deserialization_without_thumbnail() {
    use etch_core::ScreenInfo;

    // JSON without thumbnail field - should default to None
    let json = r#"{
        "id": "screen:2",
        "name": "Display 2",
        "width": 2560,
        "height": 1440,
        "is_primary": false
    }"#;

    let screen: ScreenInfo = serde_json::from_str(json).unwrap();

    assert_eq!(screen.id, "screen:2");
    assert_eq!(screen.thumbnail, None);
}

