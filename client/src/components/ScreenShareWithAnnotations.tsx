import React, { useState, useEffect } from "react";
import { useLiveKit } from "../contexts/LiveKitContext";
import ScreenShare from "./ScreenShare";
import ScreenShareViewer from "./ScreenShareViewer";
import AnnotationCanvas from "./AnnotationCanvas";
import AnnotationTools from "./AnnotationTools";
import { AnnotationService } from "../services/annotationService";

const ScreenShareWithAnnotations: React.FC = () => {
  const { room, localParticipant, isConnected } = useLiveKit();
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [annotationService, setAnnotationService] =
    useState<AnnotationService | null>(null);
  const [color, setColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Initialize annotation service
  useEffect(() => {
    if (!room || !isConnected || !localParticipant) {
      return;
    }

    const ownerId = localParticipant.identity || "unknown";
    const service = new AnnotationService(ownerId, async (data) => {
      await localParticipant.publishData(data);
    });

    setAnnotationService(service);
  }, [room, isConnected, localParticipant]);

  const handleClear = () => {
    if (annotationService) {
      annotationService.clearAll();
    }
  };

  // Check if user can clear (host or sharer role)
  // For now, assume all connected users can clear (will be role-based later)
  const canClear = true;

  return (
    <div className="space-y-4">
      <ScreenShare />

      <AnnotationTools
        color={color}
        strokeWidth={strokeWidth}
        onColorChange={setColor}
        onWidthChange={setStrokeWidth}
        onClear={handleClear}
        canClear={canClear}
      />

      <div className="relative bg-black rounded-lg overflow-hidden">
        <ScreenShareViewer onVideoElementReady={setVideoElement} />
        {videoElement && annotationService && (
          <AnnotationCanvas
            videoElement={videoElement}
            color={color}
            width={strokeWidth}
          />
        )}
      </div>
    </div>
  );
};

export default ScreenShareWithAnnotations;
