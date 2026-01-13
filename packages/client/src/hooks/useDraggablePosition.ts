import { useState, useCallback, useEffect, useRef, type RefObject } from 'react'

export interface Position {
  x: number
  y: number
}

export type Edge = 'top' | 'bottom' | 'left' | 'right'
export type Orientation = 'horizontal' | 'vertical'

interface UseDraggablePositionOptions {
  storageKey: string
  defaultPosition?: Position
  padding?: number
}

interface UseDraggablePositionReturn {
  position: Position
  isDragging: boolean
  edge: Edge
  orientation: Orientation
  containerRef: RefObject<HTMLDivElement | null>
  dragHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void
  }
}

const STORAGE_PREFIX = 'etch:'

function loadPosition(key: string, defaultPos: Position): Position {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return defaultPos
}

function savePosition(key: string, position: Position): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(position))
  } catch {
    // Ignore storage errors
  }
}

function calculateEdge(
  position: Position,
  containerWidth: number,
  containerHeight: number,
  viewportWidth: number,
  viewportHeight: number
): Edge {
  // Calculate center of container
  const centerX = position.x + containerWidth / 2
  const centerY = position.y + containerHeight / 2

  // Calculate relative position (0-1)
  const relX = centerX / viewportWidth
  const relY = centerY / viewportHeight

  // Determine closest edge based on zones
  // Left/right edges take priority when in the outer 30%
  if (relX < 0.3) return 'left'
  if (relX > 0.7) return 'right'
  if (relY < 0.3) return 'top'
  if (relY > 0.7) return 'bottom'

  // In the center - use whichever dimension is closer to edge
  const distToLeft = relX
  const distToRight = 1 - relX
  const distToTop = relY
  const distToBottom = 1 - relY

  const minHorizontal = Math.min(distToLeft, distToRight)
  const minVertical = Math.min(distToTop, distToBottom)

  if (minHorizontal < minVertical) {
    return distToLeft < distToRight ? 'left' : 'right'
  }
  return distToTop < distToBottom ? 'top' : 'bottom'
}

function getOrientation(edge: Edge): Orientation {
  return edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal'
}

export function useDraggablePosition(
  options: UseDraggablePositionOptions
): UseDraggablePositionReturn {
  const {
    storageKey,
    defaultPosition = { x: -1, y: -1 }, // -1 means "calculate default"
    padding = 16,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position>(() =>
    loadPosition(storageKey, defaultPosition)
  )
  const [isDragging, setIsDragging] = useState(false)
  const [edge, setEdge] = useState<Edge>('right')
  const [orientation, setOrientation] = useState<Orientation>('vertical')

  // Track drag state
  const dragState = useRef<{
    startX: number
    startY: number
    startPosX: number
    startPosY: number
    pointerId: number
  } | null>(null)

  // Calculate default position on mount if needed
  useEffect(() => {
    if (position.x === -1 || position.y === -1) {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const containerWidth = containerRef.current?.offsetWidth ?? 60
      const containerHeight = containerRef.current?.offsetHeight ?? 200

      // Default to bottom-right corner
      const defaultX = viewportWidth - containerWidth - padding
      const defaultY = viewportHeight - containerHeight - padding - 80 // Account for controls bar

      setPosition({ x: defaultX, y: defaultY })
    }
  }, [position.x, position.y, padding])

  // Update edge and orientation when position changes
  useEffect(() => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const containerWidth = containerRef.current?.offsetWidth ?? 60
    const containerHeight = containerRef.current?.offsetHeight ?? 200

    const newEdge = calculateEdge(
      position,
      containerWidth,
      containerHeight,
      viewportWidth,
      viewportHeight
    )
    setEdge(newEdge)
    setOrientation(getOrientation(newEdge))
  }, [position])

  // Constrain position to viewport
  const constrainPosition = useCallback(
    (x: number, y: number): Position => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const containerWidth = containerRef.current?.offsetWidth ?? 60
      const containerHeight = containerRef.current?.offsetHeight ?? 200

      return {
        x: Math.max(
          padding,
          Math.min(x, viewportWidth - containerWidth - padding)
        ),
        y: Math.max(
          padding,
          Math.min(y, viewportHeight - containerHeight - padding)
        ),
      }
    },
    [padding]
  )

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => constrainPosition(prev.x, prev.y))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [constrainPosition])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
        pointerId: e.pointerId,
      }
      setIsDragging(true)

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!dragState.current) return

        const deltaX = moveEvent.clientX - dragState.current.startX
        const deltaY = moveEvent.clientY - dragState.current.startY

        const newPos = constrainPosition(
          dragState.current.startPosX + deltaX,
          dragState.current.startPosY + deltaY
        )
        setPosition(newPos)
      }

      const handlePointerUp = () => {
        if (dragState.current) {
          target.releasePointerCapture(dragState.current.pointerId)
          // Save position to localStorage
          savePosition(storageKey, position)
        }
        dragState.current = null
        setIsDragging(false)

        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
      }

      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
    },
    [position, constrainPosition, storageKey]
  )

  // Save position when it changes (debounced by drag end)
  useEffect(() => {
    if (!isDragging && position.x !== -1 && position.y !== -1) {
      savePosition(storageKey, position)
    }
  }, [isDragging, position, storageKey])

  return {
    position,
    isDragging,
    edge,
    orientation,
    containerRef,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
    },
  }
}
