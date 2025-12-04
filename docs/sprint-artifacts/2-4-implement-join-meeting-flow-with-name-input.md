# Story 2.4: Implement Join Meeting Flow with Name Input

Status: done

## Story

As a **user**,
I want **to enter my display name when joining a meeting**,
So that **other participants can identify me**.

## Acceptance Criteria

1. **AC-2.4.1: Join Dialog Display**
   - Given I click "Join" with a valid room code on the home screen
   - When the join dialog/page appears
   - Then I see:
     - "Join Meeting" title with room ID displayed
     - "Your name" input field (pre-filled if I've joined before)
     - "Join" primary button
     - "Cancel" secondary button (or back navigation)

2. **AC-2.4.2: Name Input Validation**
   - Given I'm on the join dialog
   - When I interact with the name input
   - Then I see:
     - Minimum 1 character required
     - Maximum 50 characters allowed
     - Focus on open (auto-focus)
     - Validation error shown below input if empty on submit

3. **AC-2.4.3: Name Pre-fill from Storage**
   - Given I've joined a meeting before
   - When the join dialog opens
   - Then the name input is pre-filled with my previously used name from localStorage
   - And I can edit or keep the pre-filled name

4. **AC-2.4.4: Join Button Loading State**
   - Given I enter a valid name
   - When I click "Join"
   - Then I see a loading spinner on the button
   - And the button is disabled during the API call
   - And the input is disabled during the API call

5. **AC-2.4.5: Successful Join Flow**
   - Given I click "Join" with a valid name
   - When the join API call succeeds
   - Then my name is saved to localStorage for next time
   - And the app navigates to the meeting room view
   - And the room store is populated with connection info

6. **AC-2.4.6: Join API Error Handling**
   - Given I click "Join"
   - When the join API fails (room not found, server error, etc.)
   - Then I see an error toast with a helpful message
   - And the button returns to its normal state
   - And I remain on the join dialog to try again or go back

7. **AC-2.4.7: Keyboard Navigation**
   - Given I'm focused on the name input
   - When I press `Enter`
   - Then the join form is submitted (same as clicking "Join")

8. **AC-2.4.8: Cancel/Back Navigation**
   - Given I'm on the join dialog
   - When I click "Cancel" or navigate back
   - Then I return to the home screen
   - And any entered name is not saved

## Tasks / Subtasks

- [x] **Task 1: Create JoinRoom component implementation** (AC: 2.4.1, 2.4.2)
  - [x] Replace placeholder JoinRoom component with full implementation
  - [x] Add "Join Meeting" title showing room ID from URL params
  - [x] Add name input field with proper styling
  - [x] Add "Join" primary button
  - [x] Add "Cancel" button or back link
  - [x] Apply dark theme styling consistent with HomeScreen

- [x] **Task 2: Implement name input logic** (AC: 2.4.2, 2.4.3)
  - [x] Create controlled input state for display name
  - [x] Pre-fill from settingsStore.displayName on mount
  - [x] Implement validation: min 1 char, max 50 chars
  - [x] Add auto-focus on input when component mounts
  - [x] Show validation error message when submitting empty

- [x] **Task 3: Implement join API integration** (AC: 2.4.4, 2.4.5, 2.4.6)
  - [x] Add `joinRoom` function to `lib/api.ts`
  - [x] Add loading state to component
  - [x] Disable form during API call
  - [x] On success: save name to settingsStore, navigate to `/room/:roomId`
  - [x] On error: show toast with error message, reset loading state
  - [x] Update roomStore with token and livekitUrl

- [x] **Task 4: Implement keyboard and navigation** (AC: 2.4.7, 2.4.8)
  - [x] Add Enter key handler for form submission
  - [x] Implement Cancel button to navigate back to home
  - [x] Handle browser back button gracefully

- [x] **Task 5: Component testing** (AC: all)
  - [x] Write component tests for JoinRoom rendering
  - [x] Test name pre-fill from settings store
  - [x] Test validation error display
  - [x] Test loading state during API call
  - [x] Test successful join navigation
  - [x] Test error toast on API failure
  - [x] Test Enter key submission
  - [x] Test cancel navigation

## Dev Notes

### Learnings from Previous Story

**From Story 2.3 (Status: done)**

- **JoinRoom Placeholder Created**: `packages/client/src/components/JoinRoom/JoinRoom.tsx` exists as placeholder - replace with full implementation
- **Routing Ready**: Route `/join/:roomId` already configured in App.tsx
- **Settings Store Available**: `useSettingsStore` with `displayName` and `setDisplayName` already implemented with persist middleware
- **Room Store Available**: `useRoomStore` with `setCurrentRoom` action ready for storing join response
- **API Client Pattern**: Follow `createRoom` function pattern in `packages/client/src/lib/api.ts`
- **Toast Pattern**: Use `sonner` toast (already configured with `<Toaster />` in App.tsx)
- **Navigation Pattern**: Use `useNavigate` from react-router-dom

[Source: docs/sprint-artifacts/2-3-build-home-screen-with-create-join-meeting-ui.md#File-List]

### API Client Addition

Add to `packages/client/src/lib/api.ts`:

```typescript
import type { JoinRoomRequest, JoinRoomResponse } from '@nameless/shared';

export async function joinRoom(roomId: string, participantName: string): Promise<JoinRoomResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantName } as JoinRoomRequest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to join room');
  }

  return response.json();
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#APIs-and-Interfaces]

### Component Structure

```typescript
// packages/client/src/components/JoinRoom/JoinRoom.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { joinRoom } from '@/lib/api';
import { useSettingsStore } from '@/stores/settingsStore';
import { useRoomStore } from '@/stores/roomStore';

export function JoinRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { displayName, setDisplayName } = useSettingsStore();
  const { setCurrentRoom } = useRoomStore();

  const [name, setName] = useState(displayName);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill name from settings on mount
  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  // ... rest of component
}
```

### UI Layout Pattern

Follow HomeScreen visual patterns:
- Dark background (`bg-background`)
- Centered card container
- Consistent spacing and typography
- Use shadcn/ui Button and Input components
- Error states use destructive color

### Dependencies

Already available from Story 2.3:
- `react-router-dom` - `useParams`, `useNavigate`
- `sonner` - `toast` function
- `zustand` - stores
- shadcn/ui - `Button`, `Input`

### References

- [Tech Spec: AC-2.4](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.4)
- [Epics: Story 2.4](docs/epics.md#Story-2.4)
- [Architecture: React Component Pattern](docs/architecture.md#React-Component-Pattern)
- [Story 2.3 Implementation](docs/sprint-artifacts/2-3-build-home-screen-with-create-join-meeting-ui.md)
- [API Contract: Join Room](docs/sprint-artifacts/tech-spec-epic-2.md#APIs-and-Interfaces)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-4-implement-join-meeting-flow-with-name-input.context.xml`

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

**Implementation Plan:**
1. Add `joinRoom` function to API client following existing `createRoom` pattern
2. Replace JoinRoom placeholder with full implementation including all AC requirements
3. Implement controlled input with validation, pre-fill from settingsStore, auto-focus
4. Add loading states, error handling via toast, success flow with navigation
5. Write comprehensive component tests (27 test cases)

### Completion Notes List

Story 2.4 implementation complete. All 8 acceptance criteria satisfied:

1. **AC-2.4.1** - Join dialog displays room ID, name input, Join button, Cancel button
2. **AC-2.4.2** - Name validation enforces 1-50 char limit, auto-focus on mount, error message on empty submit
3. **AC-2.4.3** - Name pre-fills from settingsStore.displayName (localStorage persisted)
4. **AC-2.4.4** - Loading state shows spinner, disables button and input during API call
5. **AC-2.4.5** - Successful join saves name, updates roomStore, navigates to `/room/:roomId`
6. **AC-2.4.6** - API errors show toast, button returns to normal, stays on dialog
7. **AC-2.4.7** - Enter key submits form (unless empty or loading)
8. **AC-2.4.8** - Cancel navigates to home without saving name

**Test Results:** 167 tests passing (60 client + 71 server + 36 shared)

### File List

**Modified Files:**
- `packages/client/src/lib/api.ts` - Added `joinRoom` function with proper error handling

**New Files:**
- `packages/client/src/components/JoinRoom/JoinRoom.tsx` - Full implementation (replaced placeholder)
- `packages/client/src/components/JoinRoom/JoinRoom.test.tsx` - 27 component tests

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-01 | Story context generated | SM Agent |
| 2025-12-01 | All tasks completed, ready for review | DEV Agent |
