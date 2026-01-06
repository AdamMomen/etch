import { useState, useEffect } from 'react'
import { Hand, Pencil, Highlighter, Eraser, Trash2, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAnnotationStore, type Tool } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/**
 * Tool configuration for the annotation toolbar.
 * Defines icon, label, and keyboard shortcut for each tool.
 */
interface ToolConfig {
  tool: Tool
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut: string
}

/**
 * Tool definitions for the annotation toolbar.
 * Order matches the UX spec layout: Select, Pen, Highlighter, Eraser
 */
const TOOLS: ToolConfig[] = [
  { tool: 'select', icon: Hand, label: 'Hand', shortcut: '1 / V' },
  { tool: 'pen', icon: Pencil, label: 'Pen', shortcut: '2' },
  { tool: 'highlighter', icon: Highlighter, label: 'Highlighter', shortcut: '3' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser', shortcut: '7' },
]

/**
 * All keyboard shortcuts for the annotation system.
 * Used in the help overlay dialog.
 */
const KEYBOARD_SHORTCUTS = [
  { key: '1 / V', description: 'Select tool' },
  { key: '2', description: 'Pen tool' },
  { key: '3', description: 'Highlighter tool' },
  { key: '7', description: 'Eraser tool' },
  { key: '0', description: 'Clear all annotations (host only)' },
  { key: '?', description: 'Show keyboard shortcuts' },
]

interface AnnotationToolbarProps {
  /** Whether screen share is currently active */
  isScreenShareActive: boolean
  /** Optional className for the toolbar container */
  className?: string
}

/**
 * Annotation toolbar component for switching between drawing tools.
 *
 * Per UX spec:
 * - Horizontal layout with icon buttons
 * - Active tool has filled accent background
 * - Shortcut numbers shown below icons (small, muted)
 * - Separator before destructive action (Clear All)
 * - Clear All only visible for host role
 * - Toolbar disabled (50% opacity) when no screen share active
 *
 * @see docs/ux-design-specification.md Section 6
 * @see docs/sprint-artifacts/tech-spec-epic-4.md Story 4.6
 */
export function AnnotationToolbar({
  isScreenShareActive,
  className,
}: AnnotationToolbarProps) {
  // Get active tool from store
  const activeTool = useAnnotationStore((state) => state.activeTool)
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)
  const clearAll = useAnnotationStore((state) => state.clearAll)

  // Get local participant to check role
  const localParticipant = useRoomStore((state) => state.localParticipant)
  const isHost = localParticipant?.role === 'host'

  // Handler for tool button clicks
  const handleToolClick = (tool: Tool) => {
    if (!isScreenShareActive) return
    setActiveTool(tool)
  }

  // Handler for Clear All confirmation
  const handleClearAllConfirm = () => {
    if (!isScreenShareActive || !isHost) return
    clearAll()
  }

  // Get stroke count for confirmation message
  const strokeCount = useAnnotationStore((state) => state.strokes.length)

  // State for keyboard shortcuts help dialog
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Listen for ? key to open help dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't fire if user is typing in an input field
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Don't fire if modifier keys are pressed
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      if (event.key === '?') {
        setIsHelpOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Annotation tools"
        className={cn(
          'flex items-center gap-1 rounded-lg bg-card/80 p-1 backdrop-blur-sm',
          !isScreenShareActive && 'pointer-events-none opacity-50',
          className
        )}
        data-testid="annotation-toolbar"
      >
      {/* Tool buttons */}
      {TOOLS.map(({ tool, icon: Icon, label, shortcut }) => {
        const isActive = activeTool === tool

        return (
          <Tooltip key={tool}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToolClick(tool)}
                disabled={!isScreenShareActive}
                aria-pressed={isActive}
                aria-label={`${label} tool (${shortcut})`}
                className={cn(
                  'relative h-10 w-10 flex-col gap-0.5',
                  isActive && 'bg-accent text-accent-foreground'
                )}
                data-testid={`tool-button-${tool}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] text-muted-foreground">
                  {shortcut.split(' ')[0]}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {label} ({shortcut})
            </TooltipContent>
          </Tooltip>
        )
      })}

      {/* Separator before destructive action (AC-4.6.7) */}
      {isHost && (
        <>
          <div
            className="mx-1 h-6 w-px bg-border"
            role="separator"
            aria-orientation="vertical"
            data-testid="toolbar-separator"
          />

          {/* Clear All button with confirmation - host only (AC-4.6.3) */}
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!isScreenShareActive || strokeCount === 0}
                    aria-label="Clear all annotations (0)"
                    className="relative h-10 w-10 flex-col gap-0.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    data-testid="tool-button-clear-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-[10px] text-muted-foreground">0</span>
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Clear All (0)</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all annotations?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {strokeCount} annotation{strokeCount !== 1 ? 's' : ''} from the canvas.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="clear-all-confirm"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Separator before help button */}
      <div
        className="mx-1 h-6 w-px bg-border"
        role="separator"
        aria-orientation="vertical"
      />

      {/* Keyboard shortcuts help button */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Keyboard shortcuts (?)"
                className="relative h-10 w-10 flex-col gap-0.5"
                data-testid="tool-button-help"
              >
                <Keyboard className="h-4 w-4" />
                <span className="text-[10px] text-muted-foreground">?</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Keyboard Shortcuts (?)</TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-md" data-testid="shortcuts-dialog">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-4" data-testid="shortcuts-list">
            {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm text-muted-foreground">
                  {description}
                </span>
                <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium text-muted-foreground">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  )
}
