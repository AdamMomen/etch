import React, { useRef, useEffect, useState, useCallback } from "react";
import { useLiveKit } from "../contexts/LiveKitContext";
import { AnnotationService } from "../services/annotationService";
import {
  normalizeCoordinates,
  denormalizeCoordinates,
} from "../utils/coordinateUtils";
import { AnnotationMessage } from "@nameless/shared";
import { RoomEvent } from "livekit-client";

interface AnnotationCanvasProps {
  videoElement?: HTMLVideoElement | null;
  color?: string;
  width?: number;
  onServiceReady?: (service: AnnotationService) => void;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  videoElement,
  color = "#ff0000",
  width = 2,
  onServiceReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { room, localParticipant, isConnected } = useLiveKit();
  const [annotationService, setAnnotationService] =
    useState<AnnotationService | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStrokeId, setCurrentStrokeId] = useState<string | null>(null);

  // Initialize annotation service
  useEffect(() => {
    if (!room || !isConnected || !localParticipant) {
      return;
    }

    const ownerId = localParticipant.identity || "unknown";
    console.log("🎨 Initializing AnnotationCanvas for:", ownerId);

    const service = new AnnotationService(ownerId, async (data) => {
      try {
        console.log("📤 Publishing annotation data:", data.byteLength, "bytes");
        await localParticipant.publishData(data);
        console.log("✅ Annotation data published successfully");
      } catch (error) {
        console.error("❌ Failed to publish annotation data:", error);
      }
    });

    setAnnotationService(service);

    // Notify parent component that service is ready (for clear button)
    if (onServiceReady) {
      onServiceReady(service);
    }

    // Subscribe to DataTrack messages
    const handleData = (
      payload: Uint8Array,
      participant?: any,
      kind?: any,
      topic?: string
    ) => {
      console.log("📨 Data received:", {
        from: participant?.identity || "unknown",
        size: payload.byteLength,
        kind,
        topic,
      });
      try {
        const message: AnnotationMessage = JSON.parse(
          new TextDecoder().decode(payload)
        );
        console.log("✅ Parsed annotation message:", message.type);
        service.handleMessage(message);
        redrawCanvas();
      } catch (error) {
        console.error("❌ Failed to parse annotation message:", error);
        console.error("Raw payload:", new TextDecoder().decode(payload));
      }
    };

    // Listen for data from remote participants using RoomEvent
    room.on(RoomEvent.DataReceived, handleData);

    // Request sync on join
    const syncRequest: AnnotationMessage = {
      type: "sync_request",
      requestedBy: ownerId,
    };
    console.log("🔄 Sending sync request...");
    localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify(syncRequest)))
      .then(() => {
        console.log("✅ Sync request sent");
      })
      .catch((error) => {
        console.error("❌ Failed to send sync request:", error);
      });

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, isConnected, localParticipant]);

  // Sync canvas size with video
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoElement) {
      return;
    }

    const updateCanvasSize = () => {
      canvas.width = videoElement.videoWidth || videoElement.clientWidth;
      canvas.height = videoElement.videoHeight || videoElement.clientHeight;
      redrawCanvas();
    };

    videoElement.addEventListener("loadedmetadata", updateCanvasSize);
    updateCanvasSize();

    return () => {
      videoElement.removeEventListener("loadedmetadata", updateCanvasSize);
    };
  }, [videoElement]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !annotationService) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    const strokes = annotationService.getStrokes();
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) {
        return;
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      const [startX, startY] = denormalizeCoordinates(
        stroke.points[0][0],
        stroke.points[0][1],
        canvas.width,
        canvas.height
      );
      ctx.moveTo(startX, startY);

      for (let i = 1; i < stroke.points.length; i++) {
        const [x, y] = denormalizeCoordinates(
          stroke.points[i][0],
          stroke.points[i][1],
          canvas.width,
          canvas.height
        );
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    });
  }, [annotationService]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getMousePos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      return normalizeCoordinates(x, y, canvas.width, canvas.height);
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!annotationService) {
        return;
      }

      const coords = getMousePos(e);
      if (!coords) {
        return;
      }

      setIsDrawing(true);
      const strokeId = annotationService.startStroke(color, width);
      setCurrentStrokeId(strokeId);
      annotationService.addPointToStroke(strokeId, coords[0], coords[1]);
      redrawCanvas();
    },
    [annotationService, color, width, getMousePos, redrawCanvas]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !annotationService || !currentStrokeId) {
        return;
      }

      const coords = getMousePos(e);
      if (!coords) {
        return;
      }

      annotationService.addPointToStroke(currentStrokeId, coords[0], coords[1]);
      redrawCanvas();
    },
    [isDrawing, annotationService, currentStrokeId, getMousePos, redrawCanvas]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !annotationService || !currentStrokeId) {
      return;
    }

    annotationService.endStroke(currentStrokeId);
    setIsDrawing(false);
    setCurrentStrokeId(null);
  }, [isDrawing, annotationService, currentStrokeId]);

  if (!isConnected || !videoElement) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-auto cursor-crosshair"
      style={{
        width: videoElement.clientWidth,
        height: videoElement.clientHeight,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default AnnotationCanvas;
