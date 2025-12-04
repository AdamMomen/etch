# Story 2.3: Build Home Screen with Create/Join Meeting UI

Status: done

## Story

As a **user**,
I want **a home screen where I can create a new meeting or join an existing one**,
So that **I have a clear entry point to start using NAMELESS**.

## Acceptance Criteria

1. **AC-2.3.1: Home Screen Layout**
   - Given I launch the NAMELESS application
   - When the app opens
   - Then I see the home screen with:
     - NAMELESS logo/title
     - "Start Meeting" primary button
     - "Join Meeting" input field with room code/link
     - "Join" button (enabled when input has value)

2. **AC-2.3.2: Start Meeting Flow**
   - Given I'm on the home screen
   - When I click "Start Meeting"
   - Then I see a brief loading state on the button
   - And my display name is prompted (if not previously set)
   - And the app navigates to the meeting room view on success

3. **AC-2.3.3: Join Meeting Input**
   - Given I'm on the home screen
   - When I enter text in the room code input field
   - Then the "Join" button becomes enabled
   - And if input is empty, the "Join" button is disabled

4. **AC-2.3.4: Join Meeting Button Click**
   - Given I have entered a room code/link in the input
   - When I click the "Join" button
   - Then the join dialog appears with name input (Story 2.4 scope)

5. **AC-2.3.5: Room Code Parsing**
   - Given I enter a room code in various formats
   - When the app parses the input
   - Then it extracts the room ID correctly from:
     - Full URL: `nameless://room/abc-123-xyz` → `abc-123-xyz`
     - HTTPS URL: `https://*/room/abc-123-xyz` → `abc-123-xyz`
     - Direct room ID: `abc-123-xyz` → `abc-123-xyz`

6. **AC-2.3.6: Dark Theme Styling**
   - Given I view the home screen
   - When I examine the UI
   - Then the background uses `--background: #09090b` (dark theme)
   - And the "Start Meeting" button uses accent color `--accent: #8b5cf6` (purple)

7. **AC-2.3.7: Keyboard Navigation**
   - Given I'm focused on the room code input
   - When I press `Enter`
   - Then the join form is submitted (same as clicking "Join")

8. **AC-2.3.8: API Error Handling**
   - Given I click "Start Meeting"
   - When the room creation API fails
   - Then I see an error toast with a helpful message
   - And the button returns to its normal state

## Tasks / Subtasks

- [x] **Task 1: Create Home Screen component structure** (AC: 2.3.1)
  - [x] Create `packages/client/src/components/HomeScreen/` directory
  - [x] Create `HomeScreen.tsx` component with basic layout
  - [x] Create `index.ts` barrel export
  - [x] Add route for home screen in App.tsx (root path `/`)

- [x] **Task 2: Implement visual layout** (AC: 2.3.1, 2.3.6)
  - [x] Add NAMELESS logo/title centered at top
  - [x] Create centered card container for meeting actions
  - [x] Add "Start Meeting" button with primary/accent styling
  - [x] Add divider with "or" text
  - [x] Add room code input field with placeholder "Enter room code or link"
  - [x] Add "Join" button next to/below input
  - [x] Apply dark theme colors per UX spec

- [x] **Task 3: Implement room code input logic** (AC: 2.3.3, 2.3.5, 2.3.7)
  - [x] Create controlled input state for room code
  - [x] Implement `parseRoomId(input: string): string` utility function
  - [x] Handle `nameless://room/{id}` format
  - [x] Handle `https://*.*/room/{id}` format
  - [x] Handle direct room ID format
  - [x] Enable/disable Join button based on input value
  - [x] Add Enter key handler for form submission
  - [x] Add unit tests for parseRoomId utility

- [x] **Task 4: Implement Start Meeting flow** (AC: 2.3.2, 2.3.8)
  - [x] Create API client function for `POST /api/rooms`
  - [x] Add loading state to "Start Meeting" button
  - [x] Handle name prompt if display name not set (use settingsStore)
  - [x] On success: navigate to meeting room with token
  - [x] On error: show toast notification, reset button state
  - [x] Store room info in roomStore

- [x] **Task 5: Implement Join button navigation** (AC: 2.3.4)
  - [x] On Join click: validate room code is present
  - [x] Extract room ID using parseRoomId()
  - [x] Navigate to join dialog (Story 2.4 will implement dialog)
  - [x] Pass extracted room ID to join flow

- [x] **Task 6: Set up application routing** (AC: 2.3.1)
  - [x] Configure React Router (or Tauri navigation)
  - [x] Create route: `/` → HomeScreen
  - [x] Create placeholder route: `/room/:roomId` → MeetingRoom (placeholder for Story 2.5)
  - [x] Implement navigation utility for room transitions

- [x] **Task 7: Implement settings integration** (AC: 2.3.2)
  - [x] Create/extend settingsStore with displayName persistence
  - [x] Add API base URL to settings (defaults to localhost:3000 for dev)
  - [x] Read stored display name for Start Meeting prompt
  - [x] Configure Zustand persist middleware if not already done

- [x] **Task 8: Component testing** (AC: all)
  - [x] Write component tests for HomeScreen rendering
  - [x] Test "Start Meeting" button click and loading state
  - [x] Test room code input enables/disables Join button
  - [x] Test Enter key submission
  - [x] Test parseRoomId with various input formats
  - [x] Mock API calls for integration tests

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **React Component Pattern**: Functional components with TypeScript interfaces for props
- **Zustand Store Pattern**: Use `create<State>()` for typed stores with actions
- **File Structure**: Components in `components/ComponentName/ComponentName.tsx` with barrel exports

[Source: docs/architecture.md#Implementation-Patterns]

### UI Components

Per UX Design and Architecture:
- Use shadcn/ui `Button`, `Input` components
- Dark theme is default (`--background: #09090b`)
- Accent color for primary actions (`--accent: #8b5cf6`)
- Error toasts duration: 5 seconds

[Source: docs/architecture.md#Core-Technologies]

### API Client Pattern

Create API client in `packages/client/src/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function createRoom(hostName: string): Promise<CreateRoomResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create room');
  }

  return response.json();
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#APIs-and-Interfaces]

### Settings Store

Extend or create settingsStore with localStorage persistence:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  displayName: string;
  apiBaseUrl: string;
  setDisplayName: (name: string) => void;
  setApiBaseUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      displayName: '',
      apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      setDisplayName: (name) => set({ displayName: name }),
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
    }),
    { name: 'nameless-settings' }
  )
);
```

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#Data-Models-and-Contracts]

### Room ID Parsing Utility

Create utility in `packages/client/src/utils/roomId.ts`:

```typescript
/**
 * Extract room ID from various input formats:
 * - nameless://room/abc-123-xyz
 * - https://example.com/room/abc-123-xyz
 * - abc-123-xyz (direct ID)
 */
export function parseRoomId(input: string): string {
  const trimmed = input.trim();

  // Try nameless:// protocol
  const namelessMatch = trimmed.match(/^nameless:\/\/room\/([a-z0-9-]+)$/i);
  if (namelessMatch) return namelessMatch[1];

  // Try https:// URL
  const httpsMatch = trimmed.match(/^https?:\/\/[^/]+\/room\/([a-z0-9-]+)$/i);
  if (httpsMatch) return httpsMatch[1];

  // Assume direct room ID
  return trimmed;
}
```

[Source: docs/epics.md#Story-2.3]

### Dependencies

The following should already be available from Epic 1:
- `react-router-dom` - For navigation (verify installation)
- `zustand` - For state management
- shadcn/ui components - Button, Input

Additional dependencies if needed:
- `sonner` or similar for toast notifications (check if shadcn/ui includes)

### Learnings from Stories 2.1 & 2.2

1. **Test setup**: Environment variables configured in test setup
2. **API URL**: Use `VITE_API_URL` environment variable for API base URL
3. **Error handling**: Return structured errors to client for user-friendly messages
4. **Types**: Reuse `CreateRoomRequest`, `CreateRoomResponse` from `@nameless/shared`

[Source: docs/sprint-artifacts/2-2-implement-room-join-api-endpoint.md#Learnings]

### References

- [Tech Spec: AC-2.3](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.3)
- [Architecture: React Component Pattern](docs/architecture.md#React-Component-Pattern)
- [Architecture: Zustand Store Pattern](docs/architecture.md#Zustand-Store-Pattern)
- [Epics: Story 2.3](docs/epics.md#Story-2.3)
- [Story 2.2 Implementation](docs/sprint-artifacts/2-2-implement-room-join-api-endpoint.md)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-3-build-home-screen-with-create-join-meeting-ui.context.xml`

### Debug Log

**Implementation Plan:**
1. Install required dependencies (react-router-dom, sonner)
2. Create utility functions (parseRoomId, API client)
3. Create Zustand stores (settingsStore, roomStore)
4. Create shadcn/ui Input component
5. Create HomeScreen component with all logic
6. Create placeholder components (MeetingRoom, JoinRoom)
7. Set up routing in App.tsx
8. Write comprehensive tests

**Key Decisions:**
- Used `sonner` for toast notifications (clean API, good dark theme support)
- Created separate stores for settings (persisted) and room state (transient)
- Used `window.prompt` for display name input (will be replaced with proper dialog in future)
- Created placeholder routes for `/room/:roomId` and `/join/:roomId` for future stories

### Completion Notes

Story 2.3 implementation complete. All 8 acceptance criteria satisfied:

1. **AC-2.3.1** - Home screen renders NAMELESS logo, Start Meeting button, room code input, and Join button
2. **AC-2.3.2** - Start Meeting shows loading state, prompts for name if not set, navigates to room on success
3. **AC-2.3.3** - Join button is disabled when input empty, enabled when has value
4. **AC-2.3.4** - Join button navigates to `/join/:roomId` (placeholder for Story 2.4)
5. **AC-2.3.5** - parseRoomId correctly extracts room ID from nameless://, https://, and direct formats
6. **AC-2.3.6** - Dark theme CSS already configured; uses accent color for primary button
7. **AC-2.3.7** - Enter key in input triggers join action
8. **AC-2.3.8** - API errors show toast and reset button state

**Test Results:** 140 tests passing (33 client + 71 server + 36 shared)

### File List

**New Files:**
- `packages/client/src/components/HomeScreen/HomeScreen.tsx` - Main home screen component
- `packages/client/src/components/HomeScreen/HomeScreen.test.tsx` - Component tests (17 tests)
- `packages/client/src/components/HomeScreen/index.ts` - Barrel export
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Placeholder for Story 2.5
- `packages/client/src/components/MeetingRoom/index.ts` - Barrel export
- `packages/client/src/components/JoinRoom/JoinRoom.tsx` - Placeholder for Story 2.4
- `packages/client/src/components/JoinRoom/index.ts` - Barrel export
- `packages/client/src/components/ui/input.tsx` - shadcn/ui Input component
- `packages/client/src/stores/settingsStore.ts` - Settings store with persist
- `packages/client/src/stores/roomStore.ts` - Room state store
- `packages/client/src/utils/roomId.ts` - Room ID parsing utility
- `packages/client/src/utils/roomId.test.ts` - Utility tests (11 tests)
- `packages/client/src/lib/api.ts` - API client functions

**Modified Files:**
- `packages/client/src/App.tsx` - Added routing with BrowserRouter and Toaster
- `packages/client/src/App.test.tsx` - Updated tests for new structure
- `packages/client/package.json` - Added react-router-dom and sonner dependencies

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-01 | Story context generated | SM Agent |
| 2025-12-01 | All tasks completed, ready for review | DEV Agent |
