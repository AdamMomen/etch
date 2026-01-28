import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  displayName: string
  apiBaseUrl: string
  inviteDomain: string | null // Custom domain for invite links (e.g., 'meet.example.com')
  sidebarCollapsed: boolean
  isMuted: boolean
  isVideoOff: boolean
  preferredMicrophoneId: string | null
  preferredCameraId: string | null
  theme: 'dark' | 'light'
  setDisplayName: (name: string) => void
  setApiBaseUrl: (url: string) => void
  setInviteDomain: (domain: string | null) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMuted: (muted: boolean) => void
  setVideoOff: (videoOff: boolean) => void
  setPreferredMicrophone: (id: string | null) => void
  setPreferredCamera: (id: string | null) => void
  setTheme: (theme: 'dark' | 'light') => void
  clearPreferences: () => void
}

// Determine the default API URL based on environment
function getDefaultApiBaseUrl(): string {
  // Build-time env var takes precedence
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // For Tauri (desktop), default to localhost (user configures in settings)
  if (import.meta.env.TAURI_FAMILY) {
    return 'http://localhost:3000/api'
  }
  // For web, use same origin (works when served from same server)
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/api`
  }
  // Fallback
  return 'http://localhost:3000/api'
}

const defaultSettings = {
  displayName: '', // auto genearte a name
  apiBaseUrl: getDefaultApiBaseUrl(),
  inviteDomain: null as string | null,
  sidebarCollapsed: false,
  isMuted: true, // Users start muted by default per UX spec
  isVideoOff: true, // Users start with video off by default per UX spec
  preferredMicrophoneId: null as string | null,
  preferredCameraId: null as string | null,
  theme: 'dark' as const,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setDisplayName: (name) => set({ displayName: name }),
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
      setInviteDomain: (domain) => set({ inviteDomain: domain }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMuted: (muted) => set({ isMuted: muted }),
      setVideoOff: (videoOff) => set({ isVideoOff: videoOff }),
      setPreferredMicrophone: (id) => set({ preferredMicrophoneId: id }),
      setPreferredCamera: (id) => set({ preferredCameraId: id }),
      setTheme: (theme) => set({ theme }),
      clearPreferences: () => set(defaultSettings),
    }),
    { name: 'etch-settings' }
  )
)
