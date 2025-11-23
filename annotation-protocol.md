# NAMELESS Annotation Protocol

This document defines the annotation protocol used in NAMELESS for synchronizing drawing events across participants.

## Overview

Annotations are transmitted via LiveKit DataTracks as lightweight vector events. Each client renders annotations locally for optimal performance and low latency.

## Coordinate System

All coordinates are normalized to [0,1] space:
- `x_norm = x / canvas.width`
- `y_norm = y / canvas.height`

This ensures annotations align correctly across different screen resolutions and sizes.

## Message Types

### StrokeAdd

Sent when a user starts or continues drawing a stroke.

```typescript
{
  "type": "stroke_add",
  "stroke": {
    "strokeId": "uuid-v4",
    "ownerId": "user-123",
    "color": "#ff0000",
    "width": 2,
    "points": [[0.12, 0.25], [0.13, 0.27], [0.14, 0.29]],
    "createdAt": 1731160000000
  }
}
```

**Fields:**
- `strokeId`: Unique identifier for the stroke
- `ownerId`: User ID of the annotator
- `color`: Hex color string (e.g., "#ff0000")
- `width`: Stroke width in pixels (normalized)
- `points`: Array of [x, y] normalized coordinates
- `createdAt`: Timestamp in milliseconds

### StrokeEnd

Sent when a user completes a stroke.

```typescript
{
  "type": "stroke_end",
  "strokeId": "uuid-v4"
}
```

**Fields:**
- `strokeId`: The stroke being completed

### StrokeDelete

Sent when a stroke is deleted.

```typescript
{
  "type": "stroke_delete",
  "strokeId": "uuid-v4",
  "requestedBy": "user-123"
}
```

**Fields:**
- `strokeId`: The stroke to delete
- `requestedBy`: User ID requesting deletion

**Permissions:**
- Annotators can only delete their own strokes
- Hosts and sharers can delete any stroke

### ClearAll

Sent when all annotations should be cleared.

```typescript
{
  "type": "clear_all",
  "requestedBy": "user-host-1"
}
```

**Fields:**
- `requestedBy`: User ID requesting clear (must be host or sharer)

**Permissions:**
- Only hosts and sharers can clear all annotations

### SyncRequest

Sent by a client when joining a room to request current annotation state.

```typescript
{
  "type": "sync_request",
  "requestedBy": "user-456"
}
```

**Fields:**
- `requestedBy`: User ID requesting sync

### SyncState

Response to sync_request containing all current strokes.

```typescript
{
  "type": "sync_state",
  "strokes": [
    {
      "strokeId": "uuid-1",
      "ownerId": "user-123",
      "color": "#ff0000",
      "width": 2,
      "points": [[0.1, 0.2], [0.15, 0.25]],
      "createdAt": 1731160000000
    },
    {
      "strokeId": "uuid-2",
      "ownerId": "user-789",
      "color": "#0000ff",
      "width": 3,
      "points": [[0.5, 0.5], [0.6, 0.6]],
      "createdAt": 1731160010000
    }
  ]
}
```

**Fields:**
- `strokes`: Array of all current stroke objects

## TypeScript Definitions

```typescript
type AnnotationMessage =
  | StrokeAdd
  | StrokeEnd
  | StrokeDelete
  | ClearAll
  | SyncRequest
  | SyncState;

interface Stroke {
  strokeId: string;
  ownerId: string;
  color: string;
  width: number;
  points: [number, number][]; // Normalized coordinates [x, y]
  createdAt: number;
}

interface StrokeAdd {
  type: 'stroke_add';
  stroke: Stroke;
}

interface StrokeEnd {
  type: 'stroke_end';
  strokeId: string;
}

interface StrokeDelete {
  type: 'stroke_delete';
  strokeId: string;
  requestedBy: string;
}

interface ClearAll {
  type: 'clear_all';
  requestedBy: string;
}

interface SyncRequest {
  type: 'sync_request';
  requestedBy: string;
}

interface SyncState {
  type: 'sync_state';
  strokes: Stroke[];
}
```

## Implementation Notes

1. **Normalization**: Always normalize coordinates before sending and denormalize when rendering
2. **Ownership**: Validate ownership before allowing stroke deletion
3. **Late Joiners**: Send sync_request immediately upon joining, wait for sync_state
4. **Performance**: Batch multiple points in a single stroke_add if needed, but prefer frequent updates for smoothness
5. **Error Handling**: Validate message structure and handle malformed messages gracefully
6. **Ordering**: Use timestamps to maintain stroke ordering if needed

## Rendering Flow

1. Receive `stroke_add` → Add stroke to local store → Render immediately
2. Receive `stroke_end` → Mark stroke as complete → Finalize rendering
3. Receive `stroke_delete` → Remove from local store → Re-render canvas
4. Receive `clear_all` → Clear local store → Clear canvas
5. Receive `sync_state` → Replace local store → Render all strokes

## Canvas Overlay Structure

```html
<div class="share-container">
  <video id="screen-video"></video>
  <canvas id="annotation-canvas"></canvas>
</div>
```

The canvas should be positioned absolutely over the video element with matching dimensions.

