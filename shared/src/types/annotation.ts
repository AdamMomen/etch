/**
 * Annotation Protocol Types
 * Based on annotation-protocol.md specification
 */

export interface Stroke {
  strokeId: string;
  ownerId: string;
  color: string;
  width: number;
  points: [number, number][]; // Normalized coordinates [x, y]
  createdAt: number;
}

export interface StrokeAdd {
  type: "stroke_add";
  stroke: Stroke;
}

export interface StrokeEnd {
  type: "stroke_end";
  strokeId: string;
}

export interface StrokeDelete {
  type: "stroke_delete";
  strokeId: string;
  requestedBy: string;
}

export interface ClearAll {
  type: "clear_all";
  requestedBy: string;
}

export interface SyncRequest {
  type: "sync_request";
  requestedBy: string;
}

export interface SyncState {
  type: "sync_state";
  strokes: Stroke[];
}

export type AnnotationMessage =
  | StrokeAdd
  | StrokeEnd
  | StrokeDelete
  | ClearAll
  | SyncRequest
  | SyncState;
