import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  displayName: string
  apiBaseUrl: string
  sidebarCollapsed: boolean
  isMuted: boolean
  isVideoOff: boolean
  preferredMicrophoneId: string | null
  preferredCameraId: string | null
  setDisplayName: (name: string) => void
  setApiBaseUrl: (url: string) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMuted: (muted: boolean) => void
  setVideoOff: (videoOff: boolean) => void
  setPreferredMicrophone: (id: string | null) => void
  setPreferredCamera: (id: string | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      displayName: '',
      apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      sidebarCollapsed: false,
      isMuted: true, // Users start muted by default per UX spec
      isVideoOff: true, // Users start with video off by default per UX spec
      preferredMicrophoneId: null,
      preferredCameraId: null,
      setDisplayName: (name) => set({ displayName: name }),
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMuted: (muted) => set({ isMuted: muted }),
      setVideoOff: (videoOff) => set({ isVideoOff: videoOff }),
      setPreferredMicrophone: (id) => set({ preferredMicrophoneId: id }),
      setPreferredCamera: (id) => set({ preferredCameraId: id }),
    }),
    { name: 'nameless-settings' }
  )
)
