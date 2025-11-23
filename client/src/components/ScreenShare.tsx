import React, { useEffect, useRef, useState } from "react";
import { useLiveKit } from "../contexts/LiveKitContext";
import { LocalVideoTrack } from "livekit-client";

interface ScreenShareProps {
  onScreenShareStart?: () => void;
  onScreenShareStop?: () => void;
}

const ScreenShare: React.FC<ScreenShareProps> = ({
  onScreenShareStart,
  onScreenShareStop,
}) => {
  const { room, isConnected } = useLiveKit();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [localTrack, setLocalTrack] = useState<LocalVideoTrack | null>(null);

  useEffect(() => {
    return () => {
      if (localTrack) {
        localTrack.stop();
        localTrack.detach();
      }
    };
  }, [localTrack]);

  const startScreenShare = async () => {
    if (!room || !isConnected) {
      console.error("Not connected to room");
      return;
    }

    try {
      // Get screen sources using Electron's desktopCapturer
      const electron = (window as any).electron;
      if (!electron?.desktopCapturer) {
        alert(
          "Screen capture not available. Make sure Electron APIs are properly exposed."
        );
        return;
      }

      let sources;
      try {
        sources = await electron.desktopCapturer.getSources({
          types: ["screen", "window"],
        });
      } catch (error: any) {
        console.error("Failed to get screen sources:", error);
        alert(
          `Failed to get screen sources: ${error.message || error}\n\n` +
            "Make sure:\n" +
            "1. Screen Recording permission is granted in System Preferences\n" +
            "2. The Electron app has been restarted after granting permission\n" +
            "3. Try quitting and reopening the app"
        );
        return;
      }

      if (!sources || sources.length === 0) {
        alert(
          "No screen sources available. Make sure Screen Recording permission is granted."
        );
        return;
      }

      console.log(
        `Found ${sources.length} screen sources:`,
        sources.map((s: Electron.DesktopCapturerSource) => ({
          id: s.id,
          name: s.name,
          thumbnail: s.thumbnail ? "present" : "missing",
        }))
      );

      // For now, use the first available source
      // TODO: Add UI to let user select which screen/window
      const source = sources[0];

      // Create video track from screen source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron specific
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: source.id,
          },
        } as any,
      });

      const videoTrack = stream.getVideoTracks()[0];
      // Create LocalVideoTrack from MediaStreamTrack
      const track = new LocalVideoTrack(videoTrack);

      // Attach to video element
      if (videoRef.current) {
        track.attach(videoRef.current);
      }

      // Publish to room
      await room.localParticipant.publishTrack(track);

      setLocalTrack(track);
      setIsSharing(true);
      onScreenShareStart?.();
    } catch (error: any) {
      console.error("Failed to start screen share:", error);
      const errorMessage = error.message || String(error);

      if (
        errorMessage.includes("Failed to get sources") ||
        errorMessage.includes("permission")
      ) {
        alert(
          "Screen Recording Permission Required\n\n" +
            "The app needs screen recording permission to share your screen.\n\n" +
            "Steps to fix:\n" +
            "1. Open System Preferences > Security & Privacy > Privacy > Screen Recording\n" +
            "2. Make sure Electron is checked ✅\n" +
            "3. Completely quit this app (Cmd+Q)\n" +
            "4. Restart the app\n\n" +
            "If Electron doesn't appear in the list, use 'Go to Folder' (Cmd+Shift+G) and navigate to:\n" +
            "node_modules/.pnpm/electron@*/node_modules/electron/dist/Electron.app"
        );
      } else {
        alert(
          `Failed to start screen share: ${errorMessage}\n\n` +
            "Make sure Screen Recording permission is granted and the app has been restarted."
        );
      }
    }
  };

  const stopScreenShare = async () => {
    if (!room || !localTrack) {
      return;
    }

    try {
      await room.localParticipant.unpublishTrack(localTrack);
      localTrack.stop();
      localTrack.detach();
      setLocalTrack(null);
      setIsSharing(false);
      onScreenShareStop?.();
    } catch (error) {
      console.error("Failed to stop screen share:", error);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {!isSharing ? (
          <button
            onClick={startScreenShare}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start Screen Share
          </button>
        ) : (
          <button
            onClick={stopScreenShare}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Stop Screen Share
          </button>
        )}
      </div>

      {isSharing && (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
};

export default ScreenShare;
