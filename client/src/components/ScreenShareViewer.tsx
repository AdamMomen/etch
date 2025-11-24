import React, { useEffect, useRef } from "react";
import { useLiveKit } from "../contexts/LiveKitContext";
import { RemoteTrack, RoomEvent } from "livekit-client";

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
        console.log("📺 Attaching remote screen share track to video element");
        track.attach(videoRef.current!);
      }
    };

    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      if (track.kind === "video" && track.source === "screen_share") {
        console.log("📺 Detaching remote screen share track");
        track.detach();
      }
    };

    // Subscribe to existing screen share tracks (including our own local track)
    participants.forEach((participant) => {
      participant.videoTrackPublications.forEach((publication) => {
        if (publication.track && publication.track.source === "screen_share") {
          console.log(
            "📺 Attaching existing screen share track from:",
            participant.identity
          );
          publication.track.attach(videoRef.current!);
        }
      });
    });

    // Also check local participant's screen share track
    if (room.localParticipant) {
      room.localParticipant.videoTrackPublications.forEach((publication) => {
        if (publication.track && publication.track.source === "screen_share") {
          console.log("📺 Attaching local screen share track");
          publication.track.attach(videoRef.current!);
        }
      });
    }

    // Listen for new tracks using RoomEvent constants
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    };
  }, [room, participants, isConnected]);

  if (!isConnected) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-auto"
      style={{ display: "block", minHeight: "400px" }}
    />
  );
};

export default ScreenShareViewer;
