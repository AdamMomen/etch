/**
 * Invite link generation and clipboard utilities
 * Story 2.13 - Room Invite Link Generation and Sharing
 */

export interface InviteLinkConfig {
  /**
   * Custom domain for the invite link (e.g., 'meet.example.com')
   * If not provided, uses the current origin
   */
  domain?: string
}

/**
 * Generate an invite link for a room
 *
 * The link points to a landing page that:
 * 1. Attempts to open the desktop app via deep link (etch://room/{roomId})
 * 2. Falls back to the web app if the desktop app isn't installed
 *
 * @param roomId - The room ID to generate link for
 * @param config - Optional configuration for link format
 * @returns The generated invite link (HTTP URL to landing page)
 */
export function generateInviteLink(
  roomId: string,
  config?: InviteLinkConfig
): string {
  // Use provided domain or fall back to current origin
  const domain = config?.domain || window.location.host
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
  return `${protocol}://${domain}/join/${roomId}`
}

/**
 * Generate the deep link for the desktop app
 * @param roomId - The room ID
 * @returns The etch:// deep link
 */
export function generateDeepLink(roomId: string): string {
  return `etch://room/${roomId}`
}

/**
 * Copy text to clipboard using browser Clipboard API
 * Works in both browser and Tauri WebView contexts
 * @param text - The text to copy
 * @returns true if copy succeeded, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
