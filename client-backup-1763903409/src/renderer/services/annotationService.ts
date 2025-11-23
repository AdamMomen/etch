import { AnnotationMessage, Stroke } from '@nameless/shared';
import { DataPacket_Kind } from 'livekit-client';

export class AnnotationService {
  private strokes: Map<string, Stroke> = new Map();
  private currentStrokeId: string | null = null;
  private ownerId: string;
  private publishData: (data: Uint8Array, kind?: DataPacket_Kind) => Promise<void>;

  constructor(
    ownerId: string,
    publishData: (data: Uint8Array, kind?: DataPacket_Kind) => Promise<void>
  ) {
    this.ownerId = ownerId;
    this.publishData = publishData;
  }

  /**
   * Start a new stroke
   */
  startStroke(color: string, width: number): string {
    const strokeId = this.generateStrokeId();
    this.currentStrokeId = strokeId;

    const stroke: Stroke = {
      strokeId,
      ownerId: this.ownerId,
      color,
      width,
      points: [],
      createdAt: Date.now(),
    };

    this.strokes.set(strokeId, stroke);
    return strokeId;
  }

  /**
   * Add point to current stroke
   */
  addPointToStroke(strokeId: string, x: number, y: number): void {
    const stroke = this.strokes.get(strokeId);
    if (!stroke) {
      return;
    }

    stroke.points.push([x, y]);

    // Send stroke_add event
    const message: AnnotationMessage = {
      type: 'stroke_add',
      stroke: { ...stroke },
    };

    this.sendMessage(message);
  }

  /**
   * End current stroke
   */
  endStroke(strokeId: string): void {
    if (this.currentStrokeId !== strokeId) {
      return;
    }

    const message: AnnotationMessage = {
      type: 'stroke_end',
      strokeId,
    };

    this.sendMessage(message);
    this.currentStrokeId = null;
  }

  /**
   * Delete a stroke
   */
  deleteStroke(strokeId: string): void {
    const stroke = this.strokes.get(strokeId);
    if (!stroke) {
      return;
    }

    // Check ownership
    if (stroke.ownerId !== this.ownerId) {
      throw new Error('Cannot delete stroke owned by another user');
    }

    this.strokes.delete(strokeId);

    const message: AnnotationMessage = {
      type: 'stroke_delete',
      strokeId,
      requestedBy: this.ownerId,
    };

    this.sendMessage(message);
  }

  /**
   * Clear all strokes
   */
  clearAll(): void {
    this.strokes.clear();
    this.currentStrokeId = null;

    const message: AnnotationMessage = {
      type: 'clear_all',
      requestedBy: this.ownerId,
    };

    this.sendMessage(message);
  }

  /**
   * Handle incoming annotation message
   */
  handleMessage(message: AnnotationMessage): void {
    switch (message.type) {
      case 'stroke_add':
        this.strokes.set(message.stroke.strokeId, message.stroke);
        break;
      case 'stroke_end':
        // Stroke already added, just mark as complete if needed
        break;
      case 'stroke_delete':
        this.strokes.delete(message.strokeId);
        break;
      case 'clear_all':
        this.strokes.clear();
        this.currentStrokeId = null;
        break;
      case 'sync_state':
        this.strokes.clear();
        message.strokes.forEach((stroke) => {
          this.strokes.set(stroke.strokeId, stroke);
        });
        break;
      default:
        console.warn('Unknown annotation message type:', message);
    }
  }

  /**
   * Get all strokes
   */
  getStrokes(): Stroke[] {
    return Array.from(this.strokes.values());
  }

  /**
   * Get stroke by ID
   */
  getStroke(strokeId: string): Stroke | undefined {
    return this.strokes.get(strokeId);
  }

  /**
   * Send annotation message via DataTrack
   */
  private async sendMessage(message: AnnotationMessage): Promise<void> {
    const data = new TextEncoder().encode(JSON.stringify(message));
    await this.publishData(data, DataPacket_Kind.RELIABLE);
  }

  /**
   * Generate unique stroke ID
   */
  private generateStrokeId(): string {
    return `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

