/**
 * Colors assigned to participants for their annotations.
 * Each participant gets a unique color from this palette.
 * Colors are chosen to be visually distinct and accessible.
 */
export const PARTICIPANT_COLORS = [
  '#f97316', // Orange - Host/first participant
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#22c55e', // Green
  '#ec4899', // Pink
] as const

export type ParticipantColor = (typeof PARTICIPANT_COLORS)[number]

/**
 * Gets the participant color for a given index.
 * Colors cycle through the palette using modulo when index exceeds palette size.
 *
 * @param index - Zero-based participant index (0 = host, 1 = second participant, etc.)
 * @returns The hex color string for this participant
 *
 * @example
 * getParticipantColor(0) // '#f97316' (orange - host)
 * getParticipantColor(1) // '#06b6d4' (cyan)
 * getParticipantColor(5) // '#f97316' (orange - cycles back)
 */
export function getParticipantColor(index: number): ParticipantColor {
  // Handle negative indices by using absolute value (defensive)
  const normalizedIndex = Math.abs(Math.floor(index))
  return PARTICIPANT_COLORS[normalizedIndex % PARTICIPANT_COLORS.length]
}
