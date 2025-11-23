import React, { useEffect, useRef, useState } from 'react';
import { useLiveKit } from '../hooks/useLiveKit';
import { LocalVideoTrack, createLocalVideoTrack } from 'livekit-client';

interface ScreenShareProps {
  onScreenShareStart?: () => void;
  onScreenShareStop?: () => void;
}

const ScreenShare: React.FC<ScreenShareProps> = ({ onScreenShareStart, onScreenShareStop }) => {
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
      console.error('Not connected to room');
      return;
    }

    try {
      // Get screen sources using Electron's desktopCapturer
      const sources = await (window as any).electron?.desktopCapturer?.getSources({
        types: ['screen', 'window'],
      });

      if (!sources || sources.length === 0) {
        alert('No screen sources available');
        return;
      }

      // For now, use the first available source
      // TODO: Add UI to let user select which screen/window
      const source = sources[0];

      // Create video track from screen source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron specific
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
          },
        } as any,
      });

      const track = await createLocalVideoTrack(stream.getVideoTracks()[0]);
      
      // Attach to video element
      if (videoRef.current) {
        track.attach(videoRef.current);
      }

      // Publish to room
      await room.localParticipant.publishTrack(track, {
        source: 'screen_share',
      });

      setLocalTrack(track);
      setIsSharing(true);
      onScreenShareStart?.();
    } catch (error) {
      console.error('Failed to start screen share:', error);
      alert('Failed to start screen share. Make sure you grant screen recording permissions.');
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
      console.error('Failed to stop screen share:', error);
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

