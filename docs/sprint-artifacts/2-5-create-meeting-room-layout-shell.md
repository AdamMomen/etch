# Story 2.5: Create Meeting Room Layout Shell

Status: done

## Story

As a **user**,
I want **a meeting room interface that shows participants and meeting controls**,
So that **I have a clear view of who's in the meeting and how to interact**.

## Acceptance Criteria

1. **AC-2.5.1: Meeting Room Layout Structure**
   - Given I've joined a meeting room
   - When the meeting room view loads
   - Then I see the layout per UX spec Direction #1 (Hybrid):
     - Left sidebar: collapsible, shows participant list
     - Center: main content area (placeholder for video/screen share)
     - Top toolbar: annotation tools area (disabled placeholder until screen share)
     - Bottom: meeting controls bar

2. **AC-2.5.2: Participant Sidebar**
   - Given I'm in the meeting room
   - When I look at the left sidebar
   - Then I see:
     - "PARTICIPANTS" header
     - List of participants with avatar, name, role badge
     - My entry marked with "(You)"
     - "Invite" button at bottom

3. **AC-2.5.3: Meeting Controls Bar**
   - Given I'm in the meeting room
   - When I look at the bottom of the screen
   - Then I see the meeting controls bar with:
     - Microphone toggle button (muted by default, with slash icon)
     - Camera toggle button (off by default, with slash icon)
     - Screen share button (outline style)
     - Leave button (red/destructive style)

4. **AC-2.5.4: Sidebar Toggle**
   - Given I'm in the meeting room
   - When I press `⌘\` (Ctrl+\ on Windows)
   - Then the sidebar toggles between collapsed and expanded states
   - And the sidebar state is persisted to localStorage

5. **AC-2.5.5: Responsive Layout**
   - Given I'm in the meeting room
   - When the window width is less than 1000px
   - Then the sidebar auto-collapses
   - And I can still toggle it manually if needed

6. **AC-2.5.6: Connection Status**
   - Given I'm in the meeting room
   - When I look at the toolbar area
   - Then I see a connection status indicator showing current room state
   - And the room ID is displayed for reference

7. **AC-2.5.7: Main Content Area**
   - Given I'm in the meeting room
   - When no one is sharing their screen
   - Then the main content area shows a placeholder message
   - And the area is ready for video grid or screen share content (future stories)

8. **AC-2.5.8: Leave Button Functionality**
   - Given I'm in the meeting room
   - When I click the "Leave" button
   - Then I am disconnected from the room
   - And I am navigated back to the home screen

## Tasks / Subtasks

- [x] **Task 1: Create MeetingRoom layout structure** (AC: 2.5.1, 2.5.7)
  - [x] Replace placeholder MeetingRoom component with full layout implementation
  - [x] Create responsive grid/flex layout with sidebar, main area, toolbar areas
  - [x] Add top toolbar area (placeholder for annotation tools)
  - [x] Add main content area with placeholder state
  - [x] Apply dark theme styling consistent with other components

- [x] **Task 2: Create Sidebar component** (AC: 2.5.2, 2.5.4, 2.5.5)
  - [x] Create `Sidebar` component with "PARTICIPANTS" header
  - [x] Create `ParticipantListItem` component with avatar, name, role badge
  - [x] Implement "(You)" marker for local participant
  - [x] Add "Invite" button at bottom (opens invite modal - placeholder for now)
  - [x] Implement collapse/expand animation
  - [x] Connect to settingsStore for sidebar state persistence

- [x] **Task 3: Create MeetingControlsBar component** (AC: 2.5.3)
  - [x] Create horizontal control bar at bottom of screen
  - [x] Add microphone toggle button with muted/unmuted icons (MicOff/Mic)
  - [x] Add camera toggle button with off/on icons (VideoOff/Video)
  - [x] Add screen share button with outline style (MonitorUp)
  - [x] Add leave button with destructive styling (LogOut or PhoneOff)
  - [x] Buttons are visual placeholders - actual A/V logic in Story 2.6-2.8

- [x] **Task 4: Implement keyboard shortcut for sidebar** (AC: 2.5.4)
  - [x] Add global keyboard listener for `⌘\` / `Ctrl+\`
  - [x] Toggle sidebar via settingsStore.toggleSidebar()
  - [x] Clean up listener on component unmount

- [x] **Task 5: Implement responsive behavior** (AC: 2.5.5)
  - [x] Add window resize listener or CSS media query
  - [x] Auto-collapse sidebar when width < 1000px
  - [x] Maintain manual toggle capability when collapsed

- [x] **Task 6: Add connection status display** (AC: 2.5.6)
  - [x] Display room ID in toolbar area
  - [x] Show connection status indicator (placeholder - actual connection in Story 2.6)
  - [x] Use roomStore.currentRoom data

- [x] **Task 7: Implement leave functionality** (AC: 2.5.8)
  - [x] Add onClick handler to Leave button
  - [x] Clear roomStore.currentRoom
  - [x] Navigate to home screen

- [x] **Task 8: Component testing** (AC: all)
  - [x] Write component tests for MeetingRoom layout rendering
  - [x] Test sidebar collapse/expand
  - [x] Test keyboard shortcut
  - [x] Test responsive behavior
  - [x] Test leave navigation
  - [x] Test participant list rendering

## Dev Notes

### Learnings from Previous Story

**From Story 2.4 (Status: done)**

- **JoinRoom Pattern**: Full implementation replaced placeholder - follow same pattern for MeetingRoom
- **Stores Already Available**: `useSettingsStore` with `sidebarCollapsed` and `toggleSidebar`, `useRoomStore` with `currentRoom`
- **Navigation Pattern**: Use `useNavigate` from react-router-dom, navigate to `/` for home
- **Toast Pattern**: Use `sonner` toast for notifications
- **Component Structure**: Follow existing patterns from HomeScreen and JoinRoom

[Source: docs/sprint-artifacts/2-4-implement-join-meeting-flow-with-name-input.md#File-List]

### Existing Component Structure

The MeetingRoom placeholder exists at `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - replace with full implementation.

### Layout Structure

```typescript
// packages/client/src/components/MeetingRoom/MeetingRoom.tsx
<div className="flex h-screen flex-col bg-background">
  {/* Top Toolbar */}
  <div className="flex h-12 items-center justify-between border-b px-4">
    {/* Room ID, connection status, annotation tools placeholder */}
  </div>

  {/* Main Content */}
  <div className="flex flex-1 overflow-hidden">
    {/* Sidebar */}
    <aside className={cn("w-64 border-r", sidebarCollapsed && "w-0")}>
      {/* Participants list */}
    </aside>

    {/* Center Content */}
    <main className="flex-1">
      {/* Video grid / Screen share area */}
    </main>
  </div>

  {/* Bottom Controls Bar */}
  <div className="flex h-16 items-center justify-center gap-4 border-t">
    {/* Mic, Camera, Screen Share, Leave buttons */}
  </div>
</div>
```

### Settings Store Extension

The settingsStore may need `sidebarCollapsed` and `toggleSidebar` if not present:

```typescript
// packages/client/src/stores/settingsStore.ts
interface SettingsState {
  // ... existing
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}
```

### Participant Display

For now, show mock participant or just local user from roomStore. Real participant list comes in Story 2.6 with LiveKit integration.

```typescript
// Mock participant for layout
const localParticipant = {
  id: 'local',
  name: displayName || 'You',
  role: 'host' as const,
  color: '#f97316',
  isLocal: true,
}
```

### Control Button Icons

Use Lucide icons:
- Microphone: `Mic` / `MicOff`
- Camera: `Video` / `VideoOff`
- Screen Share: `MonitorUp` or `ScreenShare`
- Leave: `LogOut` or `PhoneOff`

### Keyboard Shortcut Detection

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault()
      toggleSidebar()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [toggleSidebar])
```

### Dependencies

Already available from previous stories:
- `react-router-dom` - `useParams`, `useNavigate`
- `zustand` - stores
- `sonner` - `toast` function
- shadcn/ui - `Button`
- `lucide-react` - icons
- `clsx` / `cn` utility

May need to add:
- Window resize hook or CSS media queries for responsive behavior

### References

- [Tech Spec: AC-2.5](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.5)
- [Epics: Story 2.5](docs/epics.md#Story-2.5)
- [Architecture: React Component Pattern](docs/architecture.md#React-Component-Pattern)
- [Story 2.4 Implementation](docs/sprint-artifacts/2-4-implement-join-meeting-flow-with-name-input.md)
- [UX Spec: Section 6 - Meeting Room Layout](docs/ux-design.md)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-5-create-meeting-room-layout-shell.context.xml`

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

**Implementation Plan:**
1. Extend settingsStore with sidebarCollapsed and toggleSidebar for sidebar state persistence
2. Create full MeetingRoom layout with header toolbar, sidebar, main content, and controls bar
3. Create Sidebar component with PARTICIPANTS header, ParticipantListItem, and Invite button
4. Create MeetingControlsBar with mic, camera, screen share, and leave buttons
5. Implement keyboard shortcut (Cmd+\ / Ctrl+\) for sidebar toggle
6. Implement responsive behavior (auto-collapse at 1000px)
7. Implement leave functionality with room store clear and navigation
8. Write comprehensive tests (26 test cases)

### Completion Notes List

Story 2.5 implementation complete. All 8 acceptance criteria satisfied:

1. **AC-2.5.1** - Meeting room layout with header, sidebar, main content area, and controls bar
2. **AC-2.5.2** - Sidebar displays PARTICIPANTS header, list with avatar/name/role badge, (You) marker, Invite button
3. **AC-2.5.3** - Controls bar with mic toggle (muted default), camera toggle (off default), screen share, leave button (destructive)
4. **AC-2.5.4** - Cmd+\ / Ctrl+\ toggles sidebar, state persisted via settingsStore with zustand persist middleware
5. **AC-2.5.5** - Window resize listener auto-collapses sidebar below 1000px, manual toggle still works
6. **AC-2.5.6** - Room ID displayed in toolbar, green connection status indicator
7. **AC-2.5.7** - Placeholder message "No one is sharing their screen" in main content area
8. **AC-2.5.8** - Leave button clears roomStore and navigates to home

**Test Results:** 193 tests passing (86 client + 71 server + 36 shared)

### File List

**Modified Files:**
- `packages/client/src/stores/settingsStore.ts` - Added sidebarCollapsed, toggleSidebar, setSidebarCollapsed
- `packages/client/src/components/MeetingRoom/index.ts` - Added exports for Sidebar and MeetingControlsBar

**New Files:**
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Full implementation (replaced placeholder)
- `packages/client/src/components/MeetingRoom/Sidebar.tsx` - Sidebar with participant list
- `packages/client/src/components/MeetingRoom/MeetingControlsBar.tsx` - Bottom controls bar
- `packages/client/src/components/MeetingRoom/MeetingRoom.test.tsx` - 26 component tests

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-01 | Story context generated | SM Agent |
| 2025-12-01 | All tasks completed, ready for review | DEV Agent |
| 2025-12-01 | Senior Developer Review - APPROVED | Review Agent |

---

## Senior Developer Review (AI)

### Reviewer
BMad

### Date
2025-12-01

### Outcome
**APPROVE** - All acceptance criteria fully implemented with verified evidence. All tasks completed as claimed. Code quality is high with proper error handling, accessibility, and comprehensive test coverage.

### Summary

Story 2.5 implements the meeting room layout shell with full compliance to all 8 acceptance criteria. The implementation follows established architecture patterns (Zustand stores, shadcn/ui, React functional components) and includes 26 passing component tests covering all requirements. No blocking issues found.

### Key Findings

**No HIGH severity issues found.**

**No MEDIUM severity issues found.**

**LOW severity observations (advisory only):**

1. **Clipboard Error Toast**: The clipboard error message "Failed to copy room link" is generic. Consider providing more context (e.g., browser permissions) in future story 2.13.
   - File: `MeetingRoom.tsx:86`
   - Severity: LOW (informational)

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-2.5.1 | Meeting Room Layout Structure | ✅ IMPLEMENTED | `MeetingRoom.tsx:90-160` - header (line 93), sidebar (line 120), main content (line 128), controls bar (line 151) |
| AC-2.5.2 | Participant Sidebar | ✅ IMPLEMENTED | `Sidebar.tsx:60-95` - "PARTICIPANTS" header (line 63-65), participant list (line 72-82), "(You)" marker (line 122-124), Invite button (line 85-94) |
| AC-2.5.3 | Meeting Controls Bar | ✅ IMPLEMENTED | `MeetingControlsBar.tsx:22-78` - mic toggle muted default, camera off default, screen share outline, leave destructive |
| AC-2.5.4 | Sidebar Toggle | ✅ IMPLEMENTED | `MeetingRoom.tsx:22-32` - Cmd+\/Ctrl+\ keyboard listener with cleanup; `settingsStore.ts:14-26` - zustand persist middleware |
| AC-2.5.5 | Responsive Layout | ✅ IMPLEMENTED | `MeetingRoom.tsx:34-47` - resize listener at 1000px breakpoint; sidebar still toggleable when collapsed |
| AC-2.5.6 | Connection Status | ✅ IMPLEMENTED | `MeetingRoom.tsx:95-106` - green indicator, "Connected" text, room ID display |
| AC-2.5.7 | Main Content Area | ✅ IMPLEMENTED | `MeetingRoom.tsx:130-146` - placeholder "No one is sharing their screen" |
| AC-2.5.8 | Leave Button Functionality | ✅ IMPLEMENTED | `MeetingRoom.tsx:74-78` - clearRoom() + navigate('/') |

**Summary: 8 of 8 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Create MeetingRoom layout structure | ✅ Complete | ✅ VERIFIED | `MeetingRoom.tsx:90-160` - full layout with header, sidebar, main, controls |
| Task 2: Create Sidebar component | ✅ Complete | ✅ VERIFIED | `Sidebar.tsx:21-98` - PARTICIPANTS header, list, (You) marker, Invite button, animations |
| Task 3: Create MeetingControlsBar component | ✅ Complete | ✅ VERIFIED | `MeetingControlsBar.tsx` - all 4 buttons with correct icons and styling |
| Task 4: Implement keyboard shortcut | ✅ Complete | ✅ VERIFIED | `MeetingRoom.tsx:22-32` - listener with proper cleanup |
| Task 5: Implement responsive behavior | ✅ Complete | ✅ VERIFIED | `MeetingRoom.tsx:34-47` - 1000px breakpoint with manual toggle preserved |
| Task 6: Add connection status display | ✅ Complete | ✅ VERIFIED | `MeetingRoom.tsx:95-106` - room ID and status indicator |
| Task 7: Implement leave functionality | ✅ Complete | ✅ VERIFIED | `MeetingRoom.tsx:74-78` - clearRoom + navigate |
| Task 8: Component testing | ✅ Complete | ✅ VERIFIED | `MeetingRoom.test.tsx` - 26 tests covering all ACs |

**Summary: 8 of 8 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

- **Test file:** `packages/client/src/components/MeetingRoom/MeetingRoom.test.tsx`
- **Tests:** 26 tests passing (verified via `pnpm test:client -- --run`)
- **Coverage by AC:**
  - AC-2.5.1: Layout rendering tests (lines 47-79)
  - AC-2.5.2: Sidebar participant tests (lines 81-117)
  - AC-2.5.3: Controls bar tests (lines 120-166)
  - AC-2.5.4: Keyboard shortcut tests (lines 169-222)
  - AC-2.5.5: Responsive behavior tests (lines 225-241)
  - AC-2.5.6: Connection status tests (lines 243-253)
  - AC-2.5.7: Main content placeholder tests (lines 256-265)
  - AC-2.5.8: Leave functionality tests (lines 268-287)
- **Gaps:** None identified

### Architectural Alignment

- ✅ Follows React functional component pattern from `architecture.md`
- ✅ Uses Zustand store pattern with persist middleware
- ✅ Uses shadcn/ui Button with proper variants (outline, destructive)
- ✅ Uses Lucide icons as specified (Mic, MicOff, Video, VideoOff, MonitorUp, LogOut, Users, Crown)
- ✅ Follows naming conventions (PascalCase components, camelCase functions)
- ✅ Co-located tests as per architecture spec
- ✅ Uses Tailwind utility classes for styling

### Security Notes

No security concerns. This is a UI-only layout shell with no user input validation requirements. Clipboard API usage is safe with proper error handling.

### Best-Practices and References

- React 19 functional components with hooks
- Zustand 5 state management with persist middleware for localStorage
- React Testing Library with user-event for realistic interaction testing
- Tailwind CSS for utility-first styling
- Accessibility: proper aria-labels on all interactive elements

### Action Items

**Code Changes Required:**
*(None - all requirements satisfied)*

**Advisory Notes:**
- Note: Consider enhancing clipboard error message in Story 2.13 (Invite Link) to provide more context about browser permissions
- Note: Connection status indicator is currently hardcoded as "Connected" - will be dynamic in Story 2.6 (LiveKit integration)
