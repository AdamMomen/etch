import React, { useEffect, useRef } from "react";
import { useLiveKit } from "../contexts/LiveKitContext";
import { RemoteTrack } from "livekit-client";

interface ScreenShareViewerProps {
  onVideoElementReady?: (element: HTMLVideoElement) => void;
}

const ScreenShareViewer: React.FC<ScreenShareViewerProps> = ({
  onVideoElementReady,
}) => {
  const { room, participants, isConnected } = useLiveKit();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && onVideoElementReady) {
      onVideoElementReady(videoRef.current);
    }
  }, [onVideoElementReady]);

  useEffect(() => {
    if (!room || !isConnected || !videoRef.current) {
      return;
    }

    const handleTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === "video" && track.source === "screen_share") {
        track.attach(videoRef.current!);
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      if (track.kind === "video" && track.source === "screen_share") {
        track.detach();
      }
    };

    // Subscribe to existing screen share tracks
    participants.forEach((participant) => {
      participant.videoTrackPublications.forEach((publication) => {
        if (publication.track && publication.track.source === "screen_share") {
          publication.track.attach(videoRef.current!);
        }
      });
    });

    // Listen for new tracks
    room.on("trackSubscribed", handleTrackSubscribed);
    room.on("trackUnsubscribed", handleTrackUnsubscribed);

    return () => {
      room.off("trackSubscribed", handleTrackSubscribed);
      room.off("trackUnsubscribed", handleTrackUnsubscribed);
    };
  }, [room, participants, isConnected]);

  if (!isConnected) {
    return null;
  }

  return (
    <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
  );
};

export default ScreenShareViewer;
