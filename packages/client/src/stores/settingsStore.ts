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

const defaultSettings = {
  displayName: '', // auto genearte a name
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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
