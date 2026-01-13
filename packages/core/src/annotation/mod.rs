//! Annotation storage and management
//!
//! Stores strokes in memory, handles stroke lifecycle,
//! and provides data for rendering.

use std::collections::HashMap;

use crate::{AnnotationTool, Color, Point};

/// A single stroke (pen, highlighter, or eraser path)
#[derive(Debug, Clone)]
pub struct Stroke {
    pub id: String,
    pub participant_id: String,
    pub tool: AnnotationTool,
    pub color: Color,
    pub points: Vec<Point>,
    pub completed: bool,
}

impl Stroke {
    pub fn new(
        id: String,
        participant_id: String,
        tool: AnnotationTool,
        color: Color,
        start_point: Point,
    ) -> Self {
        Self {
            id,
            participant_id,
            tool,
            color,
            points: vec![start_point],
            completed: false,
        }
    }

    /// Add points to the stroke
    pub fn add_points(&mut self, points: &[Point]) {
        self.points.extend_from_slice(points);
    }

    /// Mark stroke as completed
    pub fn complete(&mut self) {
        self.completed = true;
    }
}

/// In-memory annotation store
pub struct AnnotationStore {
    strokes: HashMap<String, Stroke>,
    /// Order of stroke IDs for rendering (oldest first)
    stroke_order: Vec<String>,
}

impl AnnotationStore {
    pub fn new() -> Self {
        Self {
            strokes: HashMap::new(),
            stroke_order: Vec::new(),
        }
    }

    /// Start a new stroke
    pub fn start_stroke(
        &mut self,
        stroke_id: &str,
        participant_id: &str,
        tool: AnnotationTool,
        color: Color,
        start_point: Point,
    ) {
        let stroke = Stroke::new(
            stroke_id.to_string(),
            participant_id.to_string(),
            tool,
            color,
            start_point,
        );
        self.strokes.insert(stroke_id.to_string(), stroke);
        self.stroke_order.push(stroke_id.to_string());
    }

    /// Add points to an existing stroke
    pub fn update_stroke(&mut self, stroke_id: &str, points: &[Point]) {
        if let Some(stroke) = self.strokes.get_mut(stroke_id) {
            stroke.add_points(points);
        }
    }

    /// Mark a stroke as completed
    pub fn complete_stroke(&mut self, stroke_id: &str) {
        if let Some(stroke) = self.strokes.get_mut(stroke_id) {
            stroke.complete();
        }
    }

    /// Delete a stroke
    pub fn delete_stroke(&mut self, stroke_id: &str) {
        self.strokes.remove(stroke_id);
        self.stroke_order.retain(|id| id != stroke_id);
    }

    /// Clear all strokes
    pub fn clear_all(&mut self) {
        self.strokes.clear();
        self.stroke_order.clear();
    }

    /// Get all strokes in render order
    pub fn strokes(&self) -> Vec<&Stroke> {
        self.stroke_order
            .iter()
            .filter_map(|id| self.strokes.get(id))
            .collect()
    }

    /// Get stroke count
    pub fn len(&self) -> usize {
        self.strokes.len()
    }

    /// Check if store is empty
    pub fn is_empty(&self) -> bool {
        self.strokes.is_empty()
    }

    /// Get a stroke by ID
    pub fn get(&self, stroke_id: &str) -> Option<&Stroke> {
        self.strokes.get(stroke_id)
    }

    /// Delete all strokes by a specific participant
    pub fn delete_by_participant(&mut self, participant_id: &str) {
        let to_delete: Vec<String> = self
            .strokes
            .iter()
            .filter(|(_, s)| s.participant_id == participant_id)
            .map(|(id, _)| id.clone())
            .collect();

        for id in to_delete {
            self.delete_stroke(&id);
        }
    }
}

impl Default for AnnotationStore {
    fn default() -> Self {
        Self::new()
    }
}
