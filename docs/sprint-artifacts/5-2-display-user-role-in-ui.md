# Story 5.2: Display User Role in UI

Status: review

## Story

As a **user**,
I want **to see my current role and other participants' roles**,
so that **I understand what actions I can take**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-5.2.1 | Participant list shows role badges for each participant | Test: Role badges visible |
| AC-5.2.2 | Host badge displays crown icon + "Host" label with accent color | Test: Host badge renders correctly |
| AC-5.2.3 | Sharer badge displays screen icon + "Sharing" label (when actively sharing) | Test: Badge appears dynamically when sharing starts |
| AC-5.2.4 | Viewer badge displays eye icon + "View only" label with muted color | Test: Viewer badge renders correctly |
| AC-5.2.5 | Annotator displays pen icon (subtle, default role) | Test: Annotator badge renders correctly |
| AC-5.2.6 | My own role is prominently displayed in sidebar header | Test: "You (Host)" or "You (Viewer)" appears |
| AC-5.2.7 | Clear indication if user cannot annotate | Test: "View only mode" displayed for viewers |
| AC-5.2.8 | Role badges use appropriate colors per design system | Test: Colors match CSS variables |
| AC-5.2.9 | Tooltip on badge shows full role description | Test: Hover shows explanatory text |

## Tasks / Subtasks

- [x] **Task 1: Create RoleBadge component** (AC: 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5, 5.2.8, 5.2.9)
  - [x] Create `packages/client/src/components/RoleBadge.tsx`
  - [x] Accept props: `role: Role`, `isSharingScreen?: boolean`
  - [x] Implement icon mapping:
    - Host → Crown icon (from lucide-react: `Crown`)
    - Sharer (when sharing) → Monitor icon (`Monitor`)
    - Annotator → Pen icon (`Pen`)
    - Viewer → Eye icon (`Eye`)
  - [x] Implement text mapping:
    - Host → "Host"
    - Sharer (when sharing) → "Sharing"
    - Annotator → null (no text, icon only)
    - Viewer → "View only"
  - [x] Implement color mapping using CSS variables:
    - Host → `--accent` (orange)
    - Sharer → `--info` (blue)
    - Viewer → `--text-muted` (grey)
    - Annotator → `--text-primary` (default)
  - [x] Add tooltip with role description:
    - Host: "Meeting host - Full control"
    - Sharer: "Currently sharing screen"
    - Annotator: "Can draw annotations"
    - Viewer: "View only - cannot annotate"
  - [x] Style as inline badge with icon + text layout
  - [x] Export from `packages/client/src/components/index.ts` (Not needed - direct import used)

- [x] **Task 2: Update ParticipantListItem to display role badges** (AC: 5.2.1)
  - [x] Modify `packages/client/src/components/ParticipantListItem.tsx` (Modified Sidebar.tsx directly)
  - [x] Import `RoleBadge` component
  - [x] Add RoleBadge after participant name:
    - Pass `participant.role`
    - Pass `participant.isSharingScreen` for sharer badge logic
  - [x] Ensure badge scales correctly with list item size
  - [x] Test with different roles to verify all badges render

- [x] **Task 3: Update Sidebar header to show user's own role** (AC: 5.2.6, 5.2.7)
  - [x] Modify `packages/client/src/components/Sidebar.tsx`
  - [x] Get local participant from roomStore
  - [x] Display role in header area:
    - Format: "You ({role})" - e.g., "You (Host)", "You (Annotator)"
    - For viewers: Add "View only mode" banner below header
  - [x] Use `canAnnotate(role, annotationsEnabled)` to determine if user can draw
  - [x] If cannot annotate: Show warning banner with icon:
    - Icon: Eye icon
    - Text: "View only mode - you cannot annotate"
    - Color: Muted/info color
  - [x] Style prominently so user immediately understands their capabilities

- [x] **Task 4: Handle dynamic sharer role badge** (AC: 5.2.3)
  - [x] Verify `participant.isSharingScreen` is tracked in roomStore
  - [x] Update RoleBadge to show "Sharing" badge when:
    - `role === 'sharer'` OR `isSharingScreen === true`
  - [x] Badge should appear when user starts sharing
  - [x] Badge should disappear when user stops sharing
  - [x] Test: Start/stop screen share → badge appears/disappears

- [x] **Task 5: Add unit tests for RoleBadge component** (AC: 5.2.8)
  - [x] Create `packages/client/tests/components/RoleBadge.test.tsx`
  - [x] Test: Host role renders crown icon + "Host" text
  - [x] Test: Sharer (isSharingScreen=true) renders monitor icon + "Sharing" text
  - [x] Test: Sharer (isSharingScreen=false) renders pen icon (annotator default)
  - [x] Test: Annotator renders pen icon with no text
  - [x] Test: Viewer renders eye icon + "View only" text
  - [x] Test: Tooltip shows correct description for each role
  - [x] Test: Colors match design system (check className or style attribute)
  - [x] Achieve ≥ 90% coverage for RoleBadge.tsx

- [x] **Task 6: Add integration tests for role display** (AC: 5.2.1, 5.2.6)
  - [x] Update `packages/client/tests/components/ParticipantListItem.test.tsx` (Created Sidebar.test.tsx instead)
  - [x] Test: Participant with role='host' displays host badge
  - [x] Test: Participant with role='viewer' displays viewer badge
  - [x] Test: Participant with isSharingScreen=true displays sharing badge
  - [x] Update `packages/client/tests/components/Sidebar.test.tsx` (Created new file)
  - [x] Test: Local participant role displayed in header
  - [x] Test: Viewer sees "View only mode" banner
  - [x] Test: Annotator does not see view-only banner

## Dev Notes

### Architecture Alignment

From **Tech Spec Epic 5** (docs/sprint-artifacts/tech-spec-epic-5.md):

**Component Extensions:**
- `ParticipantListItem.tsx` - Add role badge display
- `Sidebar.tsx` - Show user's own role in header

**Design System Usage:**
- Use existing CSS variables for colors:
  - `--accent` (orange) for host
  - `--info` (blue) for sharer
  - `--text-muted` (grey) for viewer
- Follow existing icon patterns from Epic 3 & 4 (lucide-react icons)
- Maintain consistent badge styling with existing UI components

**Key Decisions:**
1. **Sharer badge is dynamic**: Appears when `isSharingScreen=true`, regardless of role value
2. **Annotator is default**: No special badge (pen icon only, subtle)
3. **Viewer gets prominent warning**: "View only mode" banner to avoid confusion
4. **Host badge is distinctive**: Crown icon + accent color for clear authority indication

### Learnings from Previous Story

**From Story 5-1-implement-role-system-infrastructure (Status: done)**

- **Role Data Available:** Participant.role already stored in roomStore from Story 5.1
  - Access via `participant.role` (type: `Role`)
  - Values: 'host' | 'sharer' | 'annotator' | 'viewer'
  - Source: `packages/shared/src/types/room.ts:19`

- **Permission Functions Available:**
  - Use `canAnnotate(role, annotationsEnabled)` to determine if user can draw
  - Imported from `@etch/shared` package
  - All functions pure, < 1ms execution time
  - Source: `packages/shared/src/permissions.ts`

- **Metadata Parsing:**
  - Role updates come from LiveKit participant metadata
  - Automatically synced to roomStore via `handleParticipantMetadataChanged`
  - See pattern in `packages/client/src/hooks/useLiveKit.ts:184-203`

- **isSharingScreen Tracking:**
  - Already tracked in roomStore (from Epic 3)
  - Updated when participant starts/stops sharing
  - Use for dynamic sharer badge logic

- **Testing Infrastructure:**
  - Component tests: `packages/client/tests/components/*.test.tsx`
  - Use vitest + @testing-library/react
  - Follow patterns from existing component tests (ParticipantListItem, Sidebar)
  - Current test count: 933 client tests passing

- **Icon Library:**
  - lucide-react already installed and in use
  - Icons available: Crown, Monitor, Pen, Eye
  - See usage in existing toolbar components

[Source: docs/sprint-artifacts/5-1-implement-role-system-infrastructure.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Create:**
- `packages/client/src/components/RoleBadge.tsx` - New role badge component
- `packages/client/tests/components/RoleBadge.test.tsx` - Component tests

**Files to Modify:**
- `packages/client/src/components/ParticipantListItem.tsx` - Add role badge
- `packages/client/src/components/Sidebar.tsx` - Show user's role in header
- `packages/client/src/components/index.ts` - Export RoleBadge
- `packages/client/tests/components/ParticipantListItem.test.tsx` - Add role tests
- `packages/client/tests/components/Sidebar.test.tsx` - Add role header tests

**Files to Reference:**
- `packages/shared/src/types/room.ts` - Role type definition
- `packages/shared/src/permissions.ts` - canAnnotate() function
- `packages/client/src/stores/roomStore.ts` - Participant data source
- `packages/client/src/components/ParticipantListItem.tsx` - Existing participant UI
- `packages/client/src/components/Sidebar.tsx` - Sidebar header location

### Technical Constraints

**Role Badge Visual Specs (from Epic 5):**

| Role | Icon | Text | Color | Tooltip |
|------|------|------|-------|---------|
| Host | Crown | "Host" | `--accent` | "Meeting host - Full control" |
| Sharer (active) | Monitor | "Sharing" | `--info` | "Currently sharing screen" |
| Annotator | Pen | (none) | `--text-primary` | "Can draw annotations" |
| Viewer | Eye | "View only" | `--text-muted` | "View only - cannot annotate" |

**Dynamic Badge Logic:**
- Sharer badge shows when `participant.isSharingScreen === true`
- When sharing stops, sharer typically reverts to annotator appearance (pen icon)
- If `role === 'sharer'` but not actively sharing, show annotator default

**Sidebar Header Format:**
```
┌─────────────────────────┐
│ Participants            │
│ You (Host)              │  ← New role display
├─────────────────────────┤
│ 👑 Alice (Host)         │
│ 📺 Bob (Sharing)        │
│ ✏️  Carol              │
│ 👁️  Dave (View only)   │
└─────────────────────────┘
```

**View Only Mode Banner (for viewers):**
```
┌─────────────────────────────────┐
│ 👁️  View only mode              │
│ You cannot annotate             │
└─────────────────────────────────┘
```

### Testing Strategy

**Component Unit Tests:**

Test file: `packages/client/tests/components/RoleBadge.test.tsx`

```typescript
describe('RoleBadge', () => {
  test('host role displays crown icon and "Host" text', () => {
    render(<RoleBadge role="host" />);
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByTestId('role-icon')).toHaveClass('crown-icon');
  });

  test('sharer (active) displays monitor icon and "Sharing" text', () => {
    render(<RoleBadge role="sharer" isSharingScreen={true} />);
    expect(screen.getByText('Sharing')).toBeInTheDocument();
  });

  test('viewer displays eye icon and "View only" text', () => {
    render(<RoleBadge role="viewer" />);
    expect(screen.getByText('View only')).toBeInTheDocument();
  });

  test('annotator displays pen icon with no text', () => {
    render(<RoleBadge role="annotator" />);
    expect(screen.queryByText('Annotator')).not.toBeInTheDocument();
  });

  test('tooltip shows role description on hover', () => {
    render(<RoleBadge role="host" />);
    fireEvent.mouseOver(screen.getByRole('img'));
    expect(screen.getByText('Meeting host - Full control')).toBeVisible();
  });
});
```

**Integration Tests:**

Test file: `packages/client/tests/components/ParticipantListItem.test.tsx`

```typescript
describe('ParticipantListItem with roles', () => {
  test('displays host badge for host participant', () => {
    const participant = { id: '1', name: 'Alice', role: 'host', color: '#f97316' };
    render(<ParticipantListItem participant={participant} />);
    expect(screen.getByText('Host')).toBeInTheDocument();
  });

  test('displays sharing badge when participant is sharing', () => {
    const participant = {
      id: '1',
      name: 'Bob',
      role: 'annotator',
      isSharingScreen: true,
      color: '#06b6d4'
    };
    render(<ParticipantListItem participant={participant} />);
    expect(screen.getByText('Sharing')).toBeInTheDocument();
  });
});
```

### Dependencies

**Existing Dependencies:**
- `lucide-react`: Icon library (Crown, Monitor, Pen, Eye)
- `@radix-ui/react-tooltip`: Tooltip component
- `zustand`: roomStore for participant data
- `@testing-library/react`: Component testing
- `vitest`: Test runner

**Prerequisite Stories (All DONE):**
- Story 2.5: Create Meeting Room Layout Shell - DONE (provides Sidebar component)
- Story 5.1: Implement Role System Infrastructure - DONE (provides role data)

**Subsequent Stories (Depend on This):**
- Story 5.3: Enforce Annotation Permissions (uses role badges as visual feedback)
- Story 5.6: Implement Host Role Assignment (context menu on participant badges)

### Performance Considerations

**Rendering Performance:**
- Role badges are static once rendered (role changes infrequent)
- Use React.memo for RoleBadge to prevent unnecessary re-renders
- Tooltip only renders on hover (lazy loading)

**Bundle Size:**
- RoleBadge component: ~2KB (small, icon + text)
- Icons from lucide-react: tree-shakeable
- No new dependencies required

### Accessibility Notes

**WCAG 2.1 AA Compliance:**

1. **Color Contrast:**
   - Host badge (accent): Ensure sufficient contrast
   - Viewer badge (muted): Minimum 4.5:1 contrast ratio
   - Test with contrast checker

2. **Screen Reader Support:**
   - Role badges should have `aria-label` describing role
   - Example: `aria-label="Host badge"`
   - Tooltip description read by screen readers

3. **Keyboard Navigation:**
   - Badges should be focusable if interactive
   - Tooltip accessible via keyboard (Tab + Enter)

4. **Semantic HTML:**
   - Use `<span role="status">` for role badges
   - "View only mode" banner should be `<aside role="alert">`

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Detailed Design - UI Components]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Acceptance Criteria - AC-2]
- [Source: docs/epics/epic-5-permissions-moderation.md#Story 5.2]
- [Source: packages/shared/src/types/room.ts] - Participant interface with role
- [Source: packages/client/src/components/ParticipantListItem.tsx] - Existing participant UI
- [Source: packages/client/src/components/Sidebar.tsx] - Sidebar header location
- [Source: packages/shared/src/permissions.ts] - canAnnotate() function

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/5-2-display-user-role-in-ui.context.xml` (Generated: 2026-01-06)

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Implementation completed without blockers

### Completion Notes List

✅ Implemented comprehensive role badge system with all 4 role types (host, sharer, annotator, viewer)
✅ Dynamic sharer badge appears when isSharingScreen=true regardless of role
✅ Sidebar header shows local participant role with "You (Role)" format
✅ View-only mode banner displays for viewers using canAnnotate() permission check
✅ Replaced inline role badge logic in ParticipantListItem with reusable RoleBadge component
✅ All role badges include tooltips with role descriptions
✅ Accessibility: role="status" and aria-label on badges, role="alert" on view-only banner
✅ Created 24 comprehensive tests (15 unit + 9 integration) - all passing
✅ Full test suite: 962/962 passing (including 24 new role badge tests)
✅ No regressions introduced
✅ **TOOLTIP FIX (2026-01-06):** Migrated tooltip system to Radix UI with Portal rendering to fix clipping issue in sidebar
  - Replaced custom tooltip implementation with @radix-ui/react-tooltip
  - Tooltips now render in document body to prevent clipping by parent overflow-hidden
  - Updated 6+ test files to work with Radix tooltips (findByRole('tooltip'))
  - All 962 tests passing after migration

**Design System Compliance:**
- Colors: --accent (host), --info (sharer), --text-muted (viewer), --text-primary (annotator)
- Icons: Crown, MonitorUp, Pen, Eye (lucide-react)
- Tooltips: Keyboard accessible, Portal-based rendering (Radix UI)

### File List

**Created:**
- packages/client/src/components/RoleBadge.tsx
- packages/client/tests/components/RoleBadge.test.tsx
- packages/client/tests/components/Sidebar.test.tsx

**Modified:**
- packages/client/src/components/MeetingRoom/Sidebar.tsx
- packages/client/src/components/ui/tooltip.tsx (Tooltip fix: migrated to Radix UI)
- packages/client/src/components/ui/tooltip-button.tsx (Tooltip fix: added TooltipProvider)
- packages/client/src/components/AnnotationToolbar/AnnotationToolbar.tsx (Tooltip fix: added TooltipProvider)
- packages/client/tests/components/RoleBadge.test.tsx (Tooltip fix: updated test queries)
- packages/client/tests/components/ui/tooltip-button.test.tsx (Tooltip fix: updated test queries)
- packages/client/tests/components/ScreenShare/ScreenShareButton.test.tsx (Tooltip fix: updated test queries)
- packages/client/tests/components/AnnotationToolbar/AnnotationToolbar.test.tsx (Tooltip fix: updated test queries)
- packages/client/package.json (Added @radix-ui/react-tooltip@1.2.8)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-05 | BMad SM Agent (Sonnet 4.5) | Initial draft created from Epic 5 with learnings from Story 5.1 |
| 2026-01-06 | BMad PM Agent (Sonnet 4.5) | Story context generated and marked ready-for-dev |
| 2026-01-06 | BMad DEV Agent (Sonnet 4.5) | Implementation complete - 4 files created/modified, 24 tests added, all ACs met |
| 2026-01-06 | Claude Sonnet 4.5 | TOOLTIP FIX: Migrated to Radix UI tooltips to fix clipping issue - 9 files modified, all 962 tests passing |
| 2026-01-06 | Claude Sonnet 4.5 | Story marked as DONE - All ACs met, tests passing, tooltip issue resolved |
