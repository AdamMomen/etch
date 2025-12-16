import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, Users, ArrowRight, Loader2, Bug, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'
import { createRoom } from '@/lib/api'
import { parseRoomId } from '@/utils/roomId'
import { SettingsModal } from '@/components/Settings'

export function HomeScreen() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { displayName, setDisplayName } = useSettingsStore()
  const { setCurrentRoom } = useRoomStore()

  const handleStartMeeting = async () => {
    // If no display name, prompt for it
    let hostName = displayName
    if (!hostName) {
      const name = window.prompt('Enter your display name:')
      if (!name || !name.trim()) {
        toast.error('Display name is required to start a meeting')
        return
      }
      hostName = name.trim()
      setDisplayName(hostName)
    }

    setIsCreating(true)
    try {
      const response = await createRoom(hostName)
      setCurrentRoom({
        roomId: response.roomId,
        token: response.token,
        screenShareToken: response.screenShareToken,
        livekitUrl: response.livekitUrl,
      })
      navigate(`/room/${response.roomId}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create meeting'
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinClick = () => {
    const parsedRoomId = parseRoomId(roomCode)
    if (!parsedRoomId) {
      toast.error('Please enter a valid room code or link')
      return
    }
    // Navigate to join flow - Story 2.4 will implement the dialog
    navigate(`/join/${parsedRoomId}`)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && roomCode.trim()) {
      handleJoinClick()
    }
  }

  const isJoinDisabled = !roomCode.trim()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8">
      {/* Settings Button - Top Right */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        <Settings className="h-5 w-5" />
      </Button>

      <div className="flex flex-col items-center gap-8 text-center">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <Video className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">NAMELESS</h1>
        </div>

        {/* Tagline */}
        <p className="max-w-md text-lg text-muted-foreground">
          Open-source, self-hosted meeting platform with real-time screen
          annotations
        </p>

        {/* Start Meeting Button */}
        <Button
          size="lg"
          className="w-full max-w-sm gap-2"
          onClick={handleStartMeeting}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Users className="h-5 w-5" />
              Start Meeting
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="flex w-full max-w-sm items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Join Meeting Section */}
        <div className="flex w-full max-w-sm gap-2">
          <Input
            type="text"
            placeholder="Enter room code or link"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleJoinClick}
            disabled={isJoinDisabled}
          >
            Join
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Feature Tags */}
        <div className="mt-8 flex gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Self-hosted
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            Real-time
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
            Annotations
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
