import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FloatingBarPosition {
  x: number
  y: number
}

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
  floatingBarPosition: FloatingBarPosition | null // Persisted position for floating control bar (Story 3.7)
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
  setFloatingBarPosition: (position: FloatingBarPosition | null) => void
  clearPreferences: () => void
}

const defaultSettings = {
  displayName: '',
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  inviteDomain: null as string | null,
  sidebarCollapsed: false,
  isMuted: true, // Users start muted by default per UX spec
  isVideoOff: true, // Users start with video off by default per UX spec
  preferredMicrophoneId: null as string | null,
  preferredCameraId: null as string | null,
  theme: 'dark' as const,
  floatingBarPosition: null as FloatingBarPosition | null,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setDisplayName: (name) => set({ displayName: name }),
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
      setInviteDomain: (domain) => set({ inviteDomain: domain }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMuted: (muted) => set({ isMuted: muted }),
      setVideoOff: (videoOff) => set({ isVideoOff: videoOff }),
      setPreferredMicrophone: (id) => set({ preferredMicrophoneId: id }),
      setPreferredCamera: (id) => set({ preferredCameraId: id }),
      setTheme: (theme) => set({ theme }),
      setFloatingBarPosition: (position) => set({ floatingBarPosition: position }),
      clearPreferences: () => set(defaultSettings),
    }),
    { name: 'nameless-settings' }
  )
)
