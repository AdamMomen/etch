import { useEffect, useState, useMemo } from 'react'
import { listen } from '@tauri-apps/api/event'
import type { Participant } from '@etch/shared'
import { cn } from '@/lib/utils'

interface ParticipantsWindowState {
  localParticipant: {
    name: string
    color: string
    isVideoOff: boolean
  } | null
  remoteParticipants: Participant[]
}

/**
 * Standalone Tauri window for displaying participant video bubbles.
 *
 * This window receives participant state updates via Tauri events and displays
 * all participants as circular video bubbles. The window is always-on-top and
 * can be positioned anywhere on the screen.
 */
export function ParticipantsWindow() {
  const [state, setState] = useState<ParticipantsWindowState>({
    localParticipant: null,
    remoteParticipants: [],
  })

  // Listen for participant state updates from main window
  useEffect(() => {
    const unlisten = listen<ParticipantsWindowState>(
      'participants:update',
      (event) => {
        console.log('[ParticipantsWindow] Received update:', event.payload)
        setState(event.payload)
      }
    )

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  // Mock room for video tracks (in child window, we'll need to pass track info differently)
  // For now, we'll show avatars only since video tracks can't be easily shared across windows
  const allParticipants = useMemo(() => {
    const participants: Array<Participant & { isLocal?: boolean }> = []

    if (state.localParticipant) {
      participants.push({
        id: 'local',
        name: state.localParticipant.name,
        color: state.localParticipant.color,
        role: 'viewer',
        isSpeaking: false,
        isLocal: true,
      })
    }

    participants.push(...state.remoteParticipants)

    return participants
  }, [state])

  if (allParticipants.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-xs text-muted-foreground">No participants</span>
      </div>
    )
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center gap-2 p-3"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {allParticipants.map((participant) => {
        const isLocal = 'isLocal' in participant && participant.isLocal

        return (
          <div
            key={participant.id}
            title={participant.name}
            className={cn(
              'relative h-12 w-12 rounded-full overflow-hidden',
              'ring-2 ring-offset-1 ring-offset-transparent',
              'transition-all duration-200',
              participant.isSpeaking && 'ring-4'
            )}
            style={{
              '--tw-ring-color': participant.color,
            } as React.CSSProperties}
          >
            <div
              className="flex h-full w-full items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: participant.color }}
            >
              {participant.name.charAt(0).toUpperCase()}
              {isLocal && (
                <div className="absolute bottom-0 right-0 rounded-full bg-green-500 px-1 py-0.5 text-[8px] font-bold">
                  YOU
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
