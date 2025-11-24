import React, { useState } from "react";
import ScreenShare from "./ScreenShare";
import ScreenShareViewer from "./ScreenShareViewer";
import AnnotationCanvas from "./AnnotationCanvas";
import AnnotationTools from "./AnnotationTools";
import { AnnotationService } from "../services/annotationService";
import { useLiveKit } from "../contexts/LiveKitContext";

const ScreenShareWithAnnotations: React.FC = () => {
  const { participants } = useLiveKit();
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  const [annotationServiceRef, setAnnotationServiceRef] =
    useState<AnnotationService | null>(null);
  const [color, setColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isLocalSharing, setIsLocalSharing] = useState(false);

  // Check if there's a remote screen share
  const hasRemoteScreenShare = participants.some((participant) =>
    Array.from(participant.videoTrackPublications.values()).some(
      (pub) => pub.track && pub.track.source === "screen_share"
    )
  );

  // Note: AnnotationService is created in AnnotationCanvas component
  // This ref is just for the clear button
  const handleClear = () => {
    if (annotationServiceRef) {
      annotationServiceRef.clearAll();
    }
  };

  // Check if user can clear (host or sharer role)
  // For now, assume all connected users can clear (will be role-based later)
  const canClear = true;

  // Only show the viewer if there's a remote screen share OR if we're sharing locally
  // If we're sharing locally, we don't need the separate ScreenShare preview
  const showViewer = hasRemoteScreenShare || isLocalSharing;

  return (
    <div className="space-y-4">
      {/* Only show ScreenShare controls if not already viewing a screen share */}
      {!showViewer && (
        <ScreenShare
          onScreenShareStart={() => setIsLocalSharing(true)}
          onScreenShareStop={() => setIsLocalSharing(false)}
        />
      )}

      {/* Show controls if there's any screen share active */}
      {showViewer && (
        <>
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
            {videoElement && (
              <AnnotationCanvas
                videoElement={videoElement}
                color={color}
                width={strokeWidth}
                onServiceReady={setAnnotationServiceRef}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ScreenShareWithAnnotations;
