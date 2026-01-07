import { useEffect, useState, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'
import { emit } from '@tauri-apps/api/event'
import {
  Hand,
  Pencil,
  Highlighter,
  Eraser,
  Trash2,
  Keyboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tool } from '@/stores/annotationStore'
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

interface ToolbarWindowState {
  activeTool: Tool
  isHost: boolean
  strokeCount: number
}

interface ToolConfig {
  tool: Tool
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut: string
}

const TOOLS: ToolConfig[] = [
  { tool: 'select', icon: Hand, label: 'Hand', shortcut: '1 / V' },
  { tool: 'pen', icon: Pencil, label: 'Pen', shortcut: '2' },
  { tool: 'highlighter', icon: Highlighter, label: 'Highlighter', shortcut: '3' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser', shortcut: '7' },
]

const KEYBOARD_SHORTCUTS = [
  { key: '1 / V', description: 'Select tool' },
  { key: '2', description: 'Pen tool' },
  { key: '3', description: 'Highlighter tool' },
  { key: '7', description: 'Eraser tool' },
  { key: '0', description: 'Clear all annotations (host only)' },
  { key: '?', description: 'Show keyboard shortcuts' },
]

/**
 * Standalone Tauri window for annotation toolbar.
 *
 * This window receives annotation state updates via Tauri events and sends
 * tool selection/action events back to the main window. The window is
 * always-on-top and can be positioned anywhere on the screen.
 */
export function ToolbarWindow() {
  const [state, setState] = useState<ToolbarWindowState>({
    activeTool: 'select',
    isHost: false,
    strokeCount: 0,
  })

  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Listen for toolbar state updates from main window
  useEffect(() => {
    const unlisten = listen<ToolbarWindowState>('toolbar:update', (event) => {
      console.log('[ToolbarWindow] Received update:', event.payload)
      setState(event.payload)
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  // Handler for tool button clicks - emit event to main window
  const handleToolClick = useCallback(async (tool: Tool) => {
    console.log('[ToolbarWindow] Tool clicked:', tool)
    await emit('toolbar:tool-selected', { tool })
  }, [])

  // Handler for Clear All - emit event to main window
  const handleClearAll = useCallback(async () => {
    console.log('[ToolbarWindow] Clear all clicked')
    await emit('toolbar:clear-all')
  }, [])

  // Listen for keyboard shortcuts
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

      // Don't fire if modifier keys are pressed (except for shortcuts that need them)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      // Tool shortcuts
      if (event.key === '1' || event.key.toLowerCase() === 'v') {
        handleToolClick('select')
      } else if (event.key === '2') {
        handleToolClick('pen')
      } else if (event.key === '3') {
        handleToolClick('highlighter')
      } else if (event.key === '7') {
        handleToolClick('eraser')
      } else if (event.key === '0' && state.isHost) {
        // Clear all (host only)
        handleClearAll()
      } else if (event.key === '?') {
        setIsHelpOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isHost, handleToolClick, handleClearAll])

  return (
    <div
      className="flex h-full w-full items-center justify-center p-2"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <TooltipProvider>
        <div
          role="toolbar"
          aria-label="Annotation tools"
          className="flex items-center gap-1 rounded-lg bg-card/80 p-1 backdrop-blur-sm"
          data-testid="annotation-toolbar"
        >
          {/* Tool buttons */}
          {TOOLS.map(({ tool, icon: Icon, label, shortcut }) => {
            const isActive = state.activeTool === tool

            return (
              <Tooltip key={tool}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToolClick(tool)}
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

          {/* Separator before destructive action */}
          {state.isHost && (
            <>
              <div
                className="mx-1 h-6 w-px bg-border"
                role="separator"
                aria-orientation="vertical"
                data-testid="toolbar-separator"
              />

              {/* Clear All button with confirmation - host only */}
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={state.strokeCount === 0}
                        aria-label="Clear all annotations (0)"
                        className="relative h-10 w-10 flex-col gap-0.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        data-testid="tool-button-clear-all"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-[10px] text-muted-foreground">
                          0
                        </span>
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Clear All (0)</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Clear all annotations?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {state.strokeCount}{' '}
                      annotation
                      {state.strokeCount !== 1 ? 's' : ''} from the canvas.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
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
                    <span className="text-[10px] text-muted-foreground">
                      ?
                    </span>
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Keyboard Shortcuts (?)
              </TooltipContent>
            </Tooltip>
            <DialogContent
              className="sm:max-w-md"
              data-testid="shortcuts-dialog"
            >
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
    </div>
  )
}
