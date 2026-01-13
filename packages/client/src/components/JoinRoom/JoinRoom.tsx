import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { joinRoom } from '@/lib/api'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

const MAX_NAME_LENGTH = 50

export function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { displayName, setDisplayName } = useSettingsStore()
  const { setCurrentRoom } = useRoomStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(displayName)
  const [isJoining, setIsJoining] = useState(false)
  const [validationError, setValidationError] = useState('')

  // Pre-fill name from settings on mount and auto-focus
  useEffect(() => {
    setName(displayName)
  }, [displayName])

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus()
  }, [])

  const validateName = (value: string): boolean => {
    const trimmed = value.trim()
    if (!trimmed) {
      setValidationError('Name is required')
      return false
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setValidationError(`Name must be ${MAX_NAME_LENGTH} characters or less`)
      return false
    }
    setValidationError('')
    return true
  }

  const handleJoin = async () => {
    if (!validateName(name)) {
      return
    }

    if (!roomId) {
      toast.error('Invalid room ID')
      return
    }

    setIsJoining(true)
    try {
      // Room existence already validated on home screen - proceed with join
      const response = await joinRoom(roomId, name.trim())

      // Save name for next time
      setDisplayName(name.trim())

      // Store room info
      setCurrentRoom({
        roomId,
        token: response.token,
        screenShareToken: response.screenShareToken,
        livekitUrl: response.livekitUrl,
      })

      // Navigate to meeting room
      navigate(`/room/${roomId}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to join meeting'
      toast.error(message)
    } finally {
      setIsJoining(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isJoining) {
      handleJoin()
    }
  }

  const handleCancel = () => {
    // Don't save name when canceling
    navigate('/')
  }

  const handleNameChange = (value: string) => {
    // Enforce max length
    if (value.length <= MAX_NAME_LENGTH) {
      setName(value)
      // Clear validation error when user starts typing
      if (validationError) {
        setValidationError('')
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-md flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Join Meeting</h1>
          <p className="mt-2 text-muted-foreground">
            Room: <span className="font-mono">{roomId}</span>
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name-input" className="text-sm font-medium">
              Your name
            </label>
            <Input
              ref={inputRef}
              id="name-input"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isJoining}
              maxLength={MAX_NAME_LENGTH}
              aria-describedby={validationError ? 'name-error' : undefined}
              aria-invalid={!!validationError}
            />
            {validationError && (
              <p id="name-error" className="text-sm text-destructive">
                {validationError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isJoining}
              className="flex-1 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={isJoining}
              className="flex-1 gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Join
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
