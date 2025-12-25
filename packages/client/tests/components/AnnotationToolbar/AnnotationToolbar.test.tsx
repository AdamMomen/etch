import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AnnotationToolbar } from '@/components/AnnotationToolbar'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useRoomStore } from '@/stores/roomStore'

describe('AnnotationToolbar', () => {
  beforeEach(() => {
    // Reset stores to initial state
    act(() => {
      useAnnotationStore.setState({
        strokes: [],
        activeStroke: null,
        activeTool: 'pen',
      })
      useRoomStore.setState({
        currentRoom: null,
        isConnecting: false,
        isConnected: false,
        connectionError: null,
        localParticipant: {
          id: 'local-1',
          name: 'Test User',
          role: 'annotator',
          color: '#ff0000',
          isLocal: true,
        },
        remoteParticipants: [],
      })
    })
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────
  // BASIC RENDERING TESTS (AC-4.6.1, AC-4.6.2)
  // ─────────────────────────────────────────────────────────

  describe('basic rendering (AC-4.6.1, AC-4.6.2)', () => {
    it('renders toolbar with all tool buttons', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.getByTestId('annotation-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('tool-button-select')).toBeInTheDocument()
      expect(screen.getByTestId('tool-button-pen')).toBeInTheDocument()
      expect(screen.getByTestId('tool-button-highlighter')).toBeInTheDocument()
      expect(screen.getByTestId('tool-button-eraser')).toBeInTheDocument()
    })

    it('renders with role="toolbar" for accessibility', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toBeInTheDocument()
      expect(toolbar).toHaveAttribute('aria-label', 'Annotation tools')
    })

    it('renders tool buttons with correct aria-labels', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.getByLabelText('Hand tool (1 / V)')).toBeInTheDocument()
      expect(screen.getByLabelText('Pen tool (2)')).toBeInTheDocument()
      expect(screen.getByLabelText('Highlighter tool (3)')).toBeInTheDocument()
      expect(screen.getByLabelText('Eraser tool (7)')).toBeInTheDocument()
    })
  })

  // ─────────────────────────────────────────────────────────
  // ACTIVE TOOL STYLING TESTS (AC-4.6.4)
  // ─────────────────────────────────────────────────────────

  describe('active tool styling (AC-4.6.4)', () => {
    it('pen button has active styling when pen is active tool', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      const penButton = screen.getByTestId('tool-button-pen')
      expect(penButton).toHaveClass('bg-accent')
      expect(penButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('select button has active styling when select is active tool', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('select')
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      const selectButton = screen.getByTestId('tool-button-select')
      expect(selectButton).toHaveClass('bg-accent')
      expect(selectButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('highlighter button has active styling when highlighter is active tool', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('highlighter')
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      const highlighterButton = screen.getByTestId('tool-button-highlighter')
      expect(highlighterButton).toHaveClass('bg-accent')
      expect(highlighterButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('eraser button has active styling when eraser is active tool', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('eraser')
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      const eraserButton = screen.getByTestId('tool-button-eraser')
      expect(eraserButton).toHaveClass('bg-accent')
      expect(eraserButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('inactive tool buttons do not have active styling', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      // Other buttons should not have active class
      expect(screen.getByTestId('tool-button-select')).not.toHaveClass('bg-accent')
      expect(screen.getByTestId('tool-button-highlighter')).not.toHaveClass('bg-accent')
      expect(screen.getByTestId('tool-button-eraser')).not.toHaveClass('bg-accent')
    })
  })

  // ─────────────────────────────────────────────────────────
  // CLEAR ALL ROLE-BASED VISIBILITY TESTS (AC-4.6.3)
  // ─────────────────────────────────────────────────────────

  describe('Clear All role-based visibility (AC-4.6.3)', () => {
    it('shows Clear All button for host role', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.getByTestId('tool-button-clear-all')).toBeInTheDocument()
    })

    it('hides Clear All button for annotator role', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Annotator',
            role: 'annotator',
            color: '#ff0000',
            isLocal: true,
          },
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.queryByTestId('tool-button-clear-all')).not.toBeInTheDocument()
    })

    it('hides Clear All button for viewer role', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Viewer',
            role: 'viewer',
            color: '#ff0000',
            isLocal: true,
          },
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.queryByTestId('tool-button-clear-all')).not.toBeInTheDocument()
    })

    it('hides Clear All button for sharer role', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Sharer',
            role: 'sharer',
            color: '#ff0000',
            isLocal: true,
          },
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.queryByTestId('tool-button-clear-all')).not.toBeInTheDocument()
    })
  })

  // ─────────────────────────────────────────────────────────
  // SEPARATOR TESTS (AC-4.6.7)
  // ─────────────────────────────────────────────────────────

  describe('separator before Clear All (AC-4.6.7)', () => {
    it('shows separator before Clear All for host role', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      const separator = screen.getByTestId('toolbar-separator')
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveAttribute('role', 'separator')
    })

    it('does not show separator for non-host roles', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Annotator',
            role: 'annotator',
            color: '#ff0000',
            isLocal: true,
          },
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.queryByTestId('toolbar-separator')).not.toBeInTheDocument()
    })
  })

  // ─────────────────────────────────────────────────────────
  // DISABLED STATE TESTS (AC-4.6.8)
  // ─────────────────────────────────────────────────────────

  describe('disabled state when no screen share (AC-4.6.8)', () => {
    it('toolbar has opacity-50 when no screen share active', () => {
      render(<AnnotationToolbar isScreenShareActive={false} />)

      const toolbar = screen.getByTestId('annotation-toolbar')
      expect(toolbar).toHaveClass('opacity-50')
      expect(toolbar).toHaveClass('pointer-events-none')
    })

    it('toolbar buttons are disabled when no screen share active', () => {
      render(<AnnotationToolbar isScreenShareActive={false} />)

      expect(screen.getByTestId('tool-button-select')).toBeDisabled()
      expect(screen.getByTestId('tool-button-pen')).toBeDisabled()
      expect(screen.getByTestId('tool-button-highlighter')).toBeDisabled()
      expect(screen.getByTestId('tool-button-eraser')).toBeDisabled()
    })

    it('toolbar does not have disabled styling when screen share active', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      const toolbar = screen.getByTestId('annotation-toolbar')
      expect(toolbar).not.toHaveClass('opacity-50')
      expect(toolbar).not.toHaveClass('pointer-events-none')
    })
  })

  // ─────────────────────────────────────────────────────────
  // TOOL SELECTION TESTS
  // ─────────────────────────────────────────────────────────

  describe('tool selection', () => {
    it('clicking tool button updates store', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-highlighter'))

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('clicking select button activates select tool', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-select'))

      expect(useAnnotationStore.getState().activeTool).toBe('select')
    })

    it('clicking pen button activates pen tool', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('select')
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-pen'))

      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })

    it('clicking highlighter button activates highlighter tool', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-highlighter'))

      expect(useAnnotationStore.getState().activeTool).toBe('highlighter')
    })

    it('clicking eraser button activates eraser tool', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-eraser'))

      expect(useAnnotationStore.getState().activeTool).toBe('eraser')
    })

    it('does not change tool when screen share inactive', () => {
      act(() => {
        useAnnotationStore.getState().setActiveTool('pen')
      })

      render(<AnnotationToolbar isScreenShareActive={false} />)

      // Try to click a button - but pointer-events-none should prevent it
      // Note: fireEvent bypasses CSS pointer-events, so we test the handler logic
      fireEvent.click(screen.getByTestId('tool-button-highlighter'))

      // Tool should remain pen because handler checks isScreenShareActive
      expect(useAnnotationStore.getState().activeTool).toBe('pen')
    })
  })

  // ─────────────────────────────────────────────────────────
  // CLEAR ALL WITH CONFIRMATION TESTS
  // ─────────────────────────────────────────────────────────

  describe('Clear All with confirmation dialog', () => {
    it('opens confirmation dialog when Clear All button is clicked', async () => {
      // Set up host role with strokes
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
        useAnnotationStore.setState({
          strokes: [
            {
              id: '1',
              participantId: 'local-1',
              tool: 'pen',
              color: '#ff0000',
              points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              createdAt: Date.now(),
              isComplete: true,
            },
          ],
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-clear-all'))

      // Dialog should appear
      expect(await screen.findByText('Clear all annotations?')).toBeInTheDocument()
      expect(screen.getByText(/This will permanently delete 1 annotation/)).toBeInTheDocument()
    })

    it('clears strokes when confirmation is confirmed', async () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
        useAnnotationStore.setState({
          strokes: [
            {
              id: '1',
              participantId: 'local-1',
              tool: 'pen',
              color: '#ff0000',
              points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              createdAt: Date.now(),
              isComplete: true,
            },
          ],
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      // Open dialog
      fireEvent.click(screen.getByTestId('tool-button-clear-all'))

      // Confirm
      fireEvent.click(await screen.findByTestId('clear-all-confirm'))

      expect(useAnnotationStore.getState().strokes).toHaveLength(0)
    })

    it('does not clear strokes when Cancel is clicked', async () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
        useAnnotationStore.setState({
          strokes: [
            {
              id: '1',
              participantId: 'local-1',
              tool: 'pen',
              color: '#ff0000',
              points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              createdAt: Date.now(),
              isComplete: true,
            },
          ],
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      // Open dialog
      fireEvent.click(screen.getByTestId('tool-button-clear-all'))

      // Cancel
      fireEvent.click(await screen.findByText('Cancel'))

      // Strokes should remain
      expect(useAnnotationStore.getState().strokes).toHaveLength(1)
    })

    it('Clear All button is disabled when no strokes exist', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
        useAnnotationStore.setState({
          strokes: [],
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.getByTestId('tool-button-clear-all')).toBeDisabled()
    })

    it('Clear All button is disabled when screen share inactive', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
        useAnnotationStore.setState({
          strokes: [
            {
              id: '1',
              participantId: 'local-1',
              tool: 'pen',
              color: '#ff0000',
              points: [{ x: 0, y: 0 }],
              createdAt: Date.now(),
              isComplete: true,
            },
          ],
        })
      })

      render(<AnnotationToolbar isScreenShareActive={false} />)

      expect(screen.getByTestId('tool-button-clear-all')).toBeDisabled()
    })

    it('shows correct plural form for multiple strokes', async () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
        useAnnotationStore.setState({
          strokes: [
            {
              id: '1',
              participantId: 'local-1',
              tool: 'pen',
              color: '#ff0000',
              points: [{ x: 0, y: 0 }],
              createdAt: Date.now(),
              isComplete: true,
            },
            {
              id: '2',
              participantId: 'local-1',
              tool: 'pen',
              color: '#ff0000',
              points: [{ x: 1, y: 1 }],
              createdAt: Date.now(),
              isComplete: true,
            },
          ],
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-clear-all'))

      expect(await screen.findByText(/This will permanently delete 2 annotations/)).toBeInTheDocument()
    })
  })

  // ─────────────────────────────────────────────────────────
  // TOOLTIP TESTS (AC-4.6.5)
  // ─────────────────────────────────────────────────────────

  describe('tooltips (AC-4.6.5)', () => {
    it('shows tooltip on hover for select tool', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      const selectButton = screen.getByTestId('tool-button-select')
      fireEvent.mouseEnter(selectButton)

      // Tooltip should appear
      expect(await screen.findByText('Hand (1 / V)')).toBeInTheDocument()
    })

    it('shows tooltip on hover for pen tool', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      const penButton = screen.getByTestId('tool-button-pen')
      fireEvent.mouseEnter(penButton)

      expect(await screen.findByText('Pen (2)')).toBeInTheDocument()
    })

    it('shows tooltip on hover for highlighter tool', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      const highlighterButton = screen.getByTestId('tool-button-highlighter')
      fireEvent.mouseEnter(highlighterButton)

      expect(await screen.findByText('Highlighter (3)')).toBeInTheDocument()
    })

    it('shows tooltip on hover for eraser tool', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      const eraserButton = screen.getByTestId('tool-button-eraser')
      fireEvent.mouseEnter(eraserButton)

      expect(await screen.findByText('Eraser (7)')).toBeInTheDocument()
    })

    it('shows tooltip on hover for Clear All (host only)', async () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
        // Add strokes so button is enabled
        useAnnotationStore.setState({
          strokes: [
            {
              id: '1',
              participantId: 'local-1',
              tool: 'pen',
              color: '#ff0000',
              points: [{ x: 0, y: 0 }],
              createdAt: Date.now(),
              isComplete: true,
            },
          ],
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      const clearAllButton = screen.getByTestId('tool-button-clear-all')
      fireEvent.mouseEnter(clearAllButton)

      expect(await screen.findByText('Clear All (0)')).toBeInTheDocument()
    })
  })

  // ─────────────────────────────────────────────────────────
  // SHORTCUT NUMBER DISPLAY TESTS
  // ─────────────────────────────────────────────────────────

  describe('shortcut number display', () => {
    it('displays shortcut numbers below tool icons', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      // Check for shortcut numbers (just the first part, not the full "1 / V")
      const selectButton = screen.getByTestId('tool-button-select')
      expect(selectButton.textContent).toContain('1')

      const penButton = screen.getByTestId('tool-button-pen')
      expect(penButton.textContent).toContain('2')

      const highlighterButton = screen.getByTestId('tool-button-highlighter')
      expect(highlighterButton.textContent).toContain('3')

      const eraserButton = screen.getByTestId('tool-button-eraser')
      expect(eraserButton.textContent).toContain('7')
    })

    it('displays shortcut 0 for Clear All', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-1',
            name: 'Test Host',
            role: 'host',
            color: '#ff0000',
            isLocal: true,
          },
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      const clearAllButton = screen.getByTestId('tool-button-clear-all')
      expect(clearAllButton.textContent).toContain('0')
    })
  })

  // ─────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS HELP DIALOG TESTS
  // ─────────────────────────────────────────────────────────

  describe('keyboard shortcuts help dialog', () => {
    it('renders help button', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      expect(screen.getByTestId('tool-button-help')).toBeInTheDocument()
    })

    it('opens help dialog when button is clicked', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-help'))

      expect(await screen.findByTestId('shortcuts-dialog')).toBeInTheDocument()
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    })

    it('displays all keyboard shortcuts', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      fireEvent.click(screen.getByTestId('tool-button-help'))

      const shortcutsList = await screen.findByTestId('shortcuts-list')
      expect(shortcutsList).toBeInTheDocument()

      // Verify shortcuts are displayed
      expect(screen.getByText('Select tool')).toBeInTheDocument()
      expect(screen.getByText('Pen tool')).toBeInTheDocument()
      expect(screen.getByText('Highlighter tool')).toBeInTheDocument()
      expect(screen.getByText('Eraser tool')).toBeInTheDocument()
      expect(screen.getByText('Clear all annotations (host only)')).toBeInTheDocument()
      expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument()
    })

    it('opens help dialog when ? key is pressed', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      // Simulate pressing ? key
      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(event)

      expect(await screen.findByTestId('shortcuts-dialog')).toBeInTheDocument()
    })

    it('does not open help dialog when ? is pressed in input field', () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      // Create an input element
      const input = document.createElement('input')
      document.body.appendChild(input)

      const event = new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(event, 'target', { value: input })
      window.dispatchEvent(event)

      // Dialog should not appear
      expect(screen.queryByTestId('shortcuts-dialog')).not.toBeInTheDocument()

      document.body.removeChild(input)
    })

    it('shows tooltip on hover for help button', async () => {
      render(<AnnotationToolbar isScreenShareActive={true} />)

      const helpButton = screen.getByTestId('tool-button-help')
      fireEvent.mouseEnter(helpButton)

      expect(await screen.findByText('Keyboard Shortcuts (?)')).toBeInTheDocument()
    })
  })

  // ─────────────────────────────────────────────────────────
  // EDGE CASE TESTS
  // ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles null localParticipant gracefully', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: null,
        })
      })

      render(<AnnotationToolbar isScreenShareActive={true} />)

      // Should render without Clear All (null is not host)
      expect(screen.getByTestId('annotation-toolbar')).toBeInTheDocument()
      expect(screen.queryByTestId('tool-button-clear-all')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<AnnotationToolbar isScreenShareActive={true} className="custom-class" />)

      const toolbar = screen.getByTestId('annotation-toolbar')
      expect(toolbar).toHaveClass('custom-class')
    })
  })
})
