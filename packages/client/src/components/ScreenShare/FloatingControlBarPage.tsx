/**
 * FloatingControlBarPage - Standalone page for the floating control bar window
 *
 * This page is loaded in a separate Tauri window when screen sharing starts.
 * It receives state from the main window via BroadcastChannel and sends
 * commands back (mic toggle, camera toggle, device changes, stop sharing).
 *
 * Architecture:
 * - Main window owns the LiveKit connection
 * - This window sends commands via BroadcastChannel
 * - Main window executes commands and syncs state back
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Square,
  Pencil,
  User,
  Users,
  EyeOff,
  ChevronDown,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  floatingBarChannel,
  type FloatingBarState,
} from '@/lib/floatingBarChannel'

type ViewMode = 'single' | 'multi' | 'hide'

export function FloatingControlBarPage() {
  // State synced from main window
  const [state, setState] = useState<FloatingBarState>({
    isMuted: true,
    isVideoOff: true,
    isSharing: false,
    localParticipant: null,
    remoteParticipants: [],
    selectedAudioDevice: null,
    selectedVideoDevice: null,
    audioDevices: [],
    videoDevices: [],
  })

  // Local UI state
  const [viewMode, setViewMode] = useState<ViewMode>('multi')
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Initialize BroadcastChannel as floating window
  useEffect(() => {
    floatingBarChannel.initAsFloating()

    const unsubscribe = floatingBarChannel.onStateUpdate((newState) => {
      setState(newState)
    })

    return () => {
      unsubscribe()
      floatingBarChannel.close()
    }
  }, [])

  // Get local camera stream for preview (separate from main window's published track)
  useEffect(() => {
    if (state.isVideoOff || !state.selectedVideoDevice) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop())
        setCameraStream(null)
      }
      return
    }

    const getCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: state.selectedVideoDevice || undefined },
        })
        setCameraStream(stream)
      } catch (err) {
        console.error('[FloatingControlBarPage] Failed to get camera:', err)
      }
    }

    getCamera()

    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop())
    }
  }, [state.isVideoOff, state.selectedVideoDevice])

  // Attach camera stream to video element
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  // Command handlers
  const handleMicToggle = useCallback(() => {
    floatingBarChannel.sendCommand('TOGGLE_MIC')
  }, [])

  const handleCameraToggle = useCallback(() => {
    floatingBarChannel.sendCommand('TOGGLE_CAMERA')
  }, [])

  const handleAudioDeviceChange = useCallback((deviceId: string) => {
    floatingBarChannel.sendCommand('SWITCH_AUDIO_DEVICE', { deviceId })
  }, [])

  const handleVideoDeviceChange = useCallback((deviceId: string) => {
    floatingBarChannel.sendCommand('SWITCH_VIDEO_DEVICE', { deviceId })
  }, [])

  const handleStopClick = useCallback(() => {
    setShowStopConfirm(true)
  }, [])

  const handleStopConfirm = useCallback(() => {
    setShowStopConfirm(false)
    floatingBarChannel.sendCommand('STOP_SHARING')
  }, [])

  // Destructure state for easier access
  const {
    isMuted,
    isVideoOff,
    localParticipant,
    remoteParticipants,
    selectedAudioDevice,
    selectedVideoDevice,
    audioDevices,
    videoDevices,
  } = state

  // Participant avatars for multi view
  const participantAvatars = remoteParticipants.slice(0, 3).map((p) => ({
    id: p.id,
    name: p.name || 'Guest',
    color: p.color || '#6366f1',
  }))

  // Dynamic height based on view mode
  const getHeight = () => {
    switch (viewMode) {
      case 'hide':
        return 'h-[120px]'
      case 'single':
        return 'h-[280px]'
      case 'multi':
      default:
        return participantAvatars.length > 0 ? 'h-[420px]' : 'h-[280px]'
    }
  }

  const showVideo = !isVideoOff && cameraStream

  return (
    <>
      <div
        className={cn(
          'flex w-[200px] flex-col',
          getHeight(),
          'bg-black/85 rounded-2xl',
          'select-none',
          'shadow-2xl border border-white/10',
          'overflow-hidden',
          'transition-all duration-200'
        )}
        data-testid="floating-control-bar-page"
      >
        {/* Top Bar - View Toggles */}
        <div
          className="flex h-10 items-center justify-center gap-2 border-b border-white/10 cursor-grab"
          data-tauri-drag-region
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-full',
              viewMode === 'single'
                ? 'bg-white/20 text-white'
                : 'text-white/50 hover:bg-white/10 hover:text-white'
            )}
            onClick={() => setViewMode('single')}
            aria-label="Single view"
            title="Single view - show only your camera"
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-full',
              viewMode === 'multi'
                ? 'bg-white/20 text-white'
                : 'text-white/50 hover:bg-white/10 hover:text-white'
            )}
            onClick={() => setViewMode('multi')}
            aria-label="Multi view"
            title="Multi view - show all participants"
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-full',
              viewMode === 'hide'
                ? 'bg-white/20 text-white'
                : 'text-white/50 hover:bg-white/10 hover:text-white'
            )}
            onClick={() => setViewMode('hide')}
            aria-label="Hide videos"
            title="Hide videos - controls only"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Previews Section */}
        {viewMode !== 'hide' && (
          <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
            {/* Self Camera Preview (Oval) */}
            <div className="relative flex-1 min-h-[120px] rounded-[50%] overflow-hidden bg-muted/30 border-2 border-white/20">
              {showVideo ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center text-white text-2xl font-medium"
                  style={{ backgroundColor: localParticipant?.color || '#6366f1' }}
                >
                  {localParticipant?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              {/* Camera off overlay */}
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <CameraOff className="w-6 h-6 text-white/80" />
                </div>
              )}
              {/* "You" label */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 rounded-full">
                <span className="text-[10px] text-white/80">You</span>
              </div>
            </div>

            {/* Participant Preview (Multi view only) */}
            {viewMode === 'multi' && participantAvatars.length > 0 && (
              <div className="relative flex-1 min-h-[120px] rounded-[50%] overflow-hidden bg-muted/30 border-2 border-white/20">
                {participantAvatars.length === 1 ? (
                  <div
                    className="h-full w-full flex items-center justify-center text-white text-2xl font-medium"
                    style={{ backgroundColor: participantAvatars[0].color }}
                  >
                    {participantAvatars[0].name.charAt(0).toUpperCase()}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 rounded-full">
                      <span className="text-[10px] text-white/80 truncate max-w-[80px]">
                        {participantAvatars[0].name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="flex -space-x-3">
                      {participantAvatars.map((p, i) => (
                        <div
                          key={p.id}
                          className="w-10 h-10 rounded-full border-2 border-black/80 flex items-center justify-center text-sm font-medium text-white"
                          style={{ backgroundColor: p.color, zIndex: participantAvatars.length - i }}
                          title={p.name}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="flex h-[60px] items-center justify-center gap-3 border-t border-white/10 px-3">
          {/* Annotation Button (placeholder) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-white/40 cursor-not-allowed"
            disabled
            aria-label="Annotate (coming soon)"
            title="Annotation coming soon"
          >
            <Pencil className="h-5 w-5" />
          </Button>

          {/* Camera Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-11 w-11 rounded-full relative',
                  isVideoOff
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('[data-dropdown-indicator]')) {
                    handleCameraToggle()
                  }
                }}
                aria-label={isVideoOff ? 'Enable camera' : 'Disable camera'}
              >
                {isVideoOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                <ChevronDown
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-white/60"
                  data-dropdown-indicator
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-56">
              <DropdownMenuLabel>Camera</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {videoDevices.map((device) => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => handleVideoDeviceChange(device.deviceId)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{device.label}</span>
                  {selectedVideoDevice === device.deviceId && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
              {videoDevices.length === 0 && (
                <DropdownMenuItem disabled>No cameras found</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mic Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-11 w-11 rounded-full relative',
                  isMuted
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('[data-dropdown-indicator]')) {
                    handleMicToggle()
                  }
                }}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <ChevronDown
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-white/60"
                  data-dropdown-indicator
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-56">
              <DropdownMenuLabel>Microphone</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {audioDevices.map((device) => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => handleAudioDeviceChange(device.deviceId)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{device.label}</span>
                  {selectedAudioDevice === device.deviceId && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
              {audioDevices.length === 0 && (
                <DropdownMenuItem disabled>No microphones found</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Stop Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full bg-red-500/80 text-white hover:bg-red-500"
            onClick={handleStopClick}
            aria-label="Stop sharing"
            title="Stop sharing"
          >
            <Square className="h-5 w-5 fill-current" />
          </Button>
        </div>
      </div>

      {/* Stop Confirmation Dialog */}
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent className="max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle>Stop sharing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop your screen share and close this control bar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopConfirm} className="bg-red-500 hover:bg-red-600">
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
