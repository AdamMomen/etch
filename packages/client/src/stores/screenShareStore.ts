import { create } from 'zustand'

export interface ScreenShareState {
  // State
  isSharing: boolean // Anyone sharing in room
  sharerId: string | null // Who is sharing
  sharerName: string | null
  isLocalSharing: boolean // Am I sharing
  sharedSource: 'screen' | 'window' | null
  sharedSourceId: string | null

  // Actions
  startSharing: (source: 'screen' | 'window', sourceId: string) => void
  stopSharing: () => void
  setRemoteSharer: (id: string | null, name: string | null) => void
}

const defaultState = {
  isSharing: false,
  sharerId: null as string | null,
  sharerName: null as string | null,
  isLocalSharing: false,
  sharedSource: null as 'screen' | 'window' | null,
  sharedSourceId: null as string | null,
}

export const useScreenShareStore = create<ScreenShareState>((set) => ({
  ...defaultState,

  startSharing: (source, sourceId) =>
    set({
      isSharing: true,
      isLocalSharing: true,
      sharedSource: source,
      sharedSourceId: sourceId,
    }),

  stopSharing: () =>
    set({
      isSharing: false,
      isLocalSharing: false,
      sharerId: null,
      sharerName: null,
      sharedSource: null,
      sharedSourceId: null,
    }),

  setRemoteSharer: (id, name) =>
    set({
      isSharing: id !== null,
      sharerId: id,
      sharerName: name,
      isLocalSharing: false,
    }),
}))
