# Story 2.16: Fix Retry Button for Closed Rooms

Status: done

## Story

As a **user**,
I want **the retry button to work when a room closes unexpectedly**,
so that **I can recover without restarting the application**.

## Context

**Issue:** Retry button doesn't work when room is closed - user stuck in error state with no recovery path.

**Impact:** Demo-blocking - if room closes during demo, cannot recover gracefully in front of audience.

**Priority:** 🔴 CRITICAL - Must fix before showcase demo.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-2.16.1 | Retry button detects closed room state | Test: Close room → verify detection |
| AC-2.16.2 | Button creates new room if previous room closed | Test: Retry creates fresh room |
| AC-2.16.3 | User successfully rejoins (new or existing room) | Test: Retry flow completes |
| AC-2.16.4 | UI shows clear feedback during retry process | Test: Loading states visible |

## Tasks / Subtasks

- [x] **Task 1: Investigate current retry button implementation** (AC: 2.16.1)
  - [x] Locate retry button component
  - [x] Review current retry logic
  - [x] Identify why it fails for closed rooms
  - [x] Document expected vs actual behavior

- [x] **Task 2: Add room state detection** (AC: 2.16.1)
  - [x] Check room state before retry attempt
  - [x] Differentiate between:
    - Room exists but disconnected
    - Room closed/doesn't exist
    - Network error
  - [x] Store room state in appropriate store

- [x] **Task 3: Implement room recreation logic** (AC: 2.16.2)
  - [x] If room closed: Trigger room creation flow
  - [x] Reuse existing room creation logic
  - [x] Handle room ID generation (new vs reuse)
  - [x] Update UI to show "Creating new room..."

- [x] **Task 4: Implement rejoin logic** (AC: 2.16.3)
  - [x] If room exists: Attempt rejoin
  - [x] Handle connection errors gracefully
  - [x] Restore participant state after rejoin
  - [x] Test both paths (create vs rejoin)

- [x] **Task 5: Add UI feedback** (AC: 2.16.4)
  - [x] Show loading state during retry
  - [x] Display "Checking room status..."
  - [x] Display "Creating new room..." if needed
  - [x] Display "Rejoining..." if room exists
  - [x] Show success/error outcomes clearly

- [x] **Task 6: Test retry scenarios** (AC: All)
  - [x] Test: Room closed → retry creates new room
  - [x] Test: Disconnected → retry rejoins same room
  - [x] Test: Network error → retry shows clear error
  - [x] Test: Multiple retry attempts work correctly
  - [x] Test: UI feedback displays correctly

## Functional Requirements

**PRD References:**
- FR6: Users can leave a meeting at any time (implies recovery)
- FR48: Application automatically reconnects after brief network interruptions

**Related:**
- Room lifecycle management
- Connection state handling

## Technical Approach

**Components to modify:**
- Retry button component (likely in error/connection UI)
- Room store (state management for room lifecycle)
- Connection logic (room join/create flows)

**Key decisions:**
- Detect closed room: Check LiveKit room status or API call
- Room recreation: Generate new room ID or reuse existing?
- State persistence: What participant state to restore?

## Definition of Done

- [x] All acceptance criteria met and verified
- [x] All tasks completed
- [x] Retry button detects closed vs disconnected state
- [x] Room recreation flow works correctly
- [x] Rejoin flow works correctly
- [x] UI feedback is clear and helpful
- [x] No regressions in existing connection handling

## Dev Agent Record

**Status:** Ready for development
**Estimated Effort:** 1-2 hours
**Priority:** CRITICAL (Demo-blocking)
**Context Reference:** N/A (bug fix based on Sprint Change Proposal)
**Related Documents:**
- `docs/sprint-change-proposal-2026-01-06.md` - Section 4, Story 2

---

**Created:** 2026-01-06 (from Sprint Change Proposal)
**Epic:** Epic 2 - Basic Meeting Experience
**Showcase Impact:** Must fix before live demo
