//! Tests for annotation storage and management

use etch_core::annotation::AnnotationStore;
use etch_core::{AnnotationTool, Color, Point};

#[test]
fn test_stroke_lifecycle() {
    let mut store = AnnotationStore::new();

    // Start stroke
    store.start_stroke(
        "stroke-1",
        "participant-1",
        AnnotationTool::Pen,
        Color::RED,
        Point {
            x: 0.1,
            y: 0.1,
            pressure: 1.0,
        },
    );

    assert_eq!(store.len(), 1);

    // Update stroke
    store.update_stroke(
        "stroke-1",
        &[
            Point {
                x: 0.2,
                y: 0.2,
                pressure: 1.0,
            },
            Point {
                x: 0.3,
                y: 0.3,
                pressure: 1.0,
            },
        ],
    );

    let stroke = store.get("stroke-1").unwrap();
    assert_eq!(stroke.points.len(), 3);
    assert!(!stroke.completed);

    // Complete stroke
    store.complete_stroke("stroke-1");
    let stroke = store.get("stroke-1").unwrap();
    assert!(stroke.completed);

    // Delete stroke
    store.delete_stroke("stroke-1");
    assert!(store.is_empty());
}

#[test]
fn test_clear_all() {
    let mut store = AnnotationStore::new();

    store.start_stroke(
        "stroke-1",
        "p1",
        AnnotationTool::Pen,
        Color::RED,
        Point {
            x: 0.1,
            y: 0.1,
            pressure: 1.0,
        },
    );
    store.start_stroke(
        "stroke-2",
        "p2",
        AnnotationTool::Highlighter,
        Color::BLUE,
        Point {
            x: 0.5,
            y: 0.5,
            pressure: 1.0,
        },
    );

    assert_eq!(store.len(), 2);

    store.clear_all();
    assert!(store.is_empty());
}

#[test]
fn test_delete_by_participant() {
    let mut store = AnnotationStore::new();

    store.start_stroke(
        "stroke-1",
        "p1",
        AnnotationTool::Pen,
        Color::RED,
        Point {
            x: 0.1,
            y: 0.1,
            pressure: 1.0,
        },
    );
    store.start_stroke(
        "stroke-2",
        "p2",
        AnnotationTool::Pen,
        Color::BLUE,
        Point {
            x: 0.2,
            y: 0.2,
            pressure: 1.0,
        },
    );
    store.start_stroke(
        "stroke-3",
        "p1",
        AnnotationTool::Pen,
        Color::GREEN,
        Point {
            x: 0.3,
            y: 0.3,
            pressure: 1.0,
        },
    );

    assert_eq!(store.len(), 3);

    store.delete_by_participant("p1");
    assert_eq!(store.len(), 1);
    assert!(store.get("stroke-2").is_some());
}

#[test]
fn test_stroke_render_order() {
    let mut store = AnnotationStore::new();

    store.start_stroke(
        "stroke-a",
        "p1",
        AnnotationTool::Pen,
        Color::RED,
        Point {
            x: 0.1,
            y: 0.1,
            pressure: 1.0,
        },
    );
    store.start_stroke(
        "stroke-b",
        "p2",
        AnnotationTool::Pen,
        Color::BLUE,
        Point {
            x: 0.2,
            y: 0.2,
            pressure: 1.0,
        },
    );
    store.start_stroke(
        "stroke-c",
        "p1",
        AnnotationTool::Pen,
        Color::GREEN,
        Point {
            x: 0.3,
            y: 0.3,
            pressure: 1.0,
        },
    );

    let strokes = store.strokes();
    assert_eq!(strokes.len(), 3);
    assert_eq!(strokes[0].id, "stroke-a");
    assert_eq!(strokes[1].id, "stroke-b");
    assert_eq!(strokes[2].id, "stroke-c");
}

#[test]
fn test_highlighter_tool() {
    let mut store = AnnotationStore::new();

    store.start_stroke(
        "highlight-1",
        "p1",
        AnnotationTool::Highlighter,
        Color {
            r: 255,
            g: 255,
            b: 0,
            a: 128,
        }, // Semi-transparent yellow
        Point {
            x: 0.1,
            y: 0.1,
            pressure: 1.0,
        },
    );

    let stroke = store.get("highlight-1").unwrap();
    assert_eq!(stroke.tool, AnnotationTool::Highlighter);
    assert_eq!(stroke.color.a, 128); // Check transparency
}
