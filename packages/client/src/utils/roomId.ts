/**
 * Extract room ID from various input formats:
 * - etch://room/abc-123-xyz
 * - https://example.com/room/abc-123-xyz
 * - abc-123-xyz (direct ID)
 */
export function parseRoomId(input: string): string {
  const trimmed = input.trim()

  // Try etch:// protocol
  const etchMatch = trimmed.match(/^etch:\/\/room\/([a-z0-9-]+)$/i)
  if (etchMatch) return etchMatch[1]

  // Try https:// URL
  const httpsMatch = trimmed.match(/^https?:\/\/[^/]+\/room\/([a-z0-9-]+)$/i)
  if (httpsMatch) return httpsMatch[1]

  // Assume direct room ID
  return trimmed
}
