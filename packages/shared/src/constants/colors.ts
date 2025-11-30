/**
 * Colors assigned to participants for their annotations.
 * Each participant gets a unique color from this palette.
 * Colors are chosen to be visually distinct and accessible.
 */
export const PARTICIPANT_COLORS = [
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#22c55e', // Green
  '#ec4899', // Pink
] as const

export type ParticipantColor = (typeof PARTICIPANT_COLORS)[number]
