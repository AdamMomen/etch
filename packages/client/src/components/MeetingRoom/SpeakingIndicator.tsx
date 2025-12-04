import { cn } from '@/lib/utils'

interface SpeakingIndicatorProps {
  isSpeaking: boolean
  color: string
  className?: string
}

/**
 * Visual speaking indicator component that shows a pulsing border animation
 * when a participant is speaking.
 *
 * Per UX spec: "subtle pulse animation on participant border"
 */
export function SpeakingIndicator({
  isSpeaking,
  color,
  className,
}: SpeakingIndicatorProps) {
  if (!isSpeaking) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute inset-0 rounded-full pointer-events-none',
        'animate-speaking-pulse',
        className
      )}
      style={{
        '--speaking-color': color,
      } as React.CSSProperties}
      aria-label="Speaking"
      role="status"
    />
  )
}

/**
 * CSS for the speaking pulse animation.
 * Add to your global CSS or Tailwind config:
 *
 * @keyframes speaking-pulse {
 *   0%, 100% { box-shadow: 0 0 0 0 rgba(var(--speaking-color), 0.4); }
 *   50% { box-shadow: 0 0 0 4px rgba(var(--speaking-color), 0.2); }
 * }
 *
 * .animate-speaking-pulse {
 *   animation: speaking-pulse 1s ease-in-out infinite;
 * }
 */
