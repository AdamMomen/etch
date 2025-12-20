# Story 4.10: Assign Unique Colors Per Participant

Status: drafted

## Story

As a **participant**,
I want **each person's annotations to have a distinct color**,
so that **I can tell who drew what**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.10.1 | Each participant has distinct color | Manual: visual differentiation |
| AC-4.10.2 | First participant (host): Orange #f97316 | Test: color assignment |
| AC-4.10.3 | Colors cycle after 5 participants (modulo logic) | Test: 6th participant gets orange |
| AC-4.10.4 | Color assigned server-side via token metadata | Test: token contains color |
| AC-4.10.5 | Color visible in annotation strokes | Test: stroke uses participant color |
| AC-4.10.6 | Color visible in participant list (avatar border) | Manual: UI verification |
| AC-4.10.7 | Colors work on light and dark backgrounds | Manual: visibility test |

## Tasks / Subtasks

- [ ] **Task 1: Define participant color palette in shared package** (AC: 4.10.2, 4.10.3)
  - [ ] Create `packages/shared/src/constants/colors.ts`
  - [ ] Define `PARTICIPANT_COLORS` array with 5 colors:
    - Orange (#f97316) - First participant/host
    - Cyan (#06b6d4)
    - Purple (#a855f7)
    - Green (#22c55e)
    - Pink (#ec4899)
  - [ ] Implement `getParticipantColor(index: number): string` function with modulo cycling
  - [ ] Export from `packages/shared/src/constants/index.ts`
  - [ ] Export from `packages/shared/src/index.ts`

- [ ] **Task 2: Write unit tests for color utilities** (AC: 4.10.2, 4.10.3)
  - [ ] Create `packages/shared/tests/constants/colors.test.ts`
  - [ ] Test first participant gets orange (#f97316)
  - [ ] Test colors 0-4 map to the 5 defined colors
  - [ ] Test color cycling: index 5 returns orange (modulo)
  - [ ] Test color cycling: index 10 returns orange
  - [ ] Test PARTICIPANT_COLORS array has exactly 5 entries

- [ ] **Task 3: Assign color server-side in token generation** (AC: 4.10.4)
  - [ ] Update `packages/server/src/services/livekit.ts` to track room participant count
  - [ ] When generating join token, determine participant index (0-based order)
  - [ ] Add `color` to token metadata: `{ role, color: getParticipantColor(index) }`
  - [ ] Import `getParticipantColor` from `@nameless/shared`
  - [ ] Host (room creator) always gets index 0 (orange)

- [ ] **Task 4: Extract color from LiveKit participant metadata on client** (AC: 4.10.4, 4.10.5)
  - [ ] Update client to extract color from participant.metadata
  - [ ] Create/update `packages/client/src/utils/colors.ts` with `getParticipantColorFromMetadata(participant: RemoteParticipant | LocalParticipant): string`
  - [ ] Handle missing metadata gracefully (fallback to first color)
  - [ ] Parse JSON metadata and extract color field

- [ ] **Task 5: Use participant color in stroke creation** (AC: 4.10.5)
  - [ ] Update `useAnnotations.ts` to get local participant's color from metadata
  - [ ] Pass color to new strokes in `startStroke` function
  - [ ] Verify strokes in annotationStore have correct color
  - [ ] Verify DataTrack messages include participant color

- [ ] **Task 6: Display participant color in annotation rendering** (AC: 4.10.5)
  - [ ] Verify AnnotationCanvas uses stroke.color for rendering
  - [ ] Confirm Perfect Freehand path uses correct fill color
  - [ ] Test: local participant's strokes appear in their assigned color
  - [ ] Test: remote participant's strokes appear in their assigned color

- [ ] **Task 7: Display participant color in participant list** (AC: 4.10.6)
  - [ ] Update ParticipantList component to show colored avatar border
  - [ ] Extract color from participant metadata
  - [ ] Apply color as border/ring on participant avatar
  - [ ] Ensure color is visible in both light and dark themes

- [ ] **Task 8: Verify color visibility on various backgrounds** (AC: 4.10.7)
  - [ ] Manual test: draw strokes on light content (white document, light IDE theme)
  - [ ] Manual test: draw strokes on dark content (dark IDE theme, terminal)
  - [ ] Manual test: draw strokes on colorful content (design tools, images)
  - [ ] Document any visibility issues for specific color/background combinations
  - [ ] Note: All 5 colors chosen for high visibility on common backgrounds

- [ ] **Task 9: Add integration tests for color flow** (AC: 4.10.4, 4.10.5)
  - [ ] Test: token generation includes color in metadata
  - [ ] Test: client extracts color correctly from participant metadata
  - [ ] Test: stroke creation uses correct color from local participant
  - [ ] Test: rendered stroke uses correct color

## Dev Notes

### Architecture Alignment

- **ADR-002:** LiveKit DataTracks for Annotations - stroke messages include participantId and color
- **Tech Spec:** Color palette defined in `@nameless/shared/constants/colors.ts`
- **Architecture:** Token metadata carries participant color assigned server-side

### Color Palette (from Tech Spec)

```typescript
// packages/shared/src/constants/colors.ts
export const PARTICIPANT_COLORS = [
  '#f97316',  // Orange (first participant/host)
  '#06b6d4',  // Cyan
  '#a855f7',  // Purple
  '#22c55e',  // Green
  '#ec4899',  // Pink
] as const;

export function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}
```

### Token Metadata Structure

```typescript
// Server-side token generation
const token = new AccessToken(apiKey, apiSecret, {
  identity: participantId,
  name: displayName,
  metadata: JSON.stringify({
    role: 'annotator',
    color: getParticipantColor(participantIndex)
  }),
});
```

### Client-Side Color Extraction

```typescript
// packages/client/src/utils/colors.ts
import { Participant } from 'livekit-client';

export function getParticipantColorFromMetadata(participant: Participant): string {
  try {
    const metadata = JSON.parse(participant.metadata || '{}');
    return metadata.color || PARTICIPANT_COLORS[0];
  } catch {
    return PARTICIPANT_COLORS[0]; // Fallback to orange
  }
}
```

### Learnings from Previous Story

**From Story 4-9-implement-resolution-independent-coordinates (Status: done)**

- **Coordinate utilities:** `packages/client/src/utils/coordinates.ts` pattern - follow same structure for color utilities
- **Test patterns:** Comprehensive unit tests in `coordinates.test.ts` - follow same thoroughness
- **useAnnotationSync:** Has validateNormalizedCoordinates - verify color is included in messages
- **Stroke structure:** Strokes have `color` field already defined in `@nameless/shared/types/annotation.ts`

**Key Files from Previous Story:**
- `packages/client/src/hooks/useAnnotations.ts` - Update to use participant color
- `packages/client/src/hooks/useAnnotationSync.ts` - Verify color included in messages
- `packages/shared/src/types/annotation.ts` - Stroke interface already has color field

[Source: docs/sprint-artifacts/4-9-implement-resolution-independent-coordinates.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Create:**
- `packages/shared/src/constants/colors.ts` - Participant color palette and utilities
- `packages/shared/tests/constants/colors.test.ts` - Unit tests for color utilities
- `packages/client/src/utils/colors.ts` - Client-side color extraction from metadata

**Files to Modify:**
- `packages/shared/src/constants/index.ts` - Export colors
- `packages/shared/src/index.ts` - Export colors from package root
- `packages/server/src/services/livekit.ts` - Add color to token metadata
- `packages/client/src/hooks/useAnnotations.ts` - Use participant color for strokes
- `packages/client/src/components/ParticipantList/` - Show colored avatar border

**Files to Reference:**
- `packages/shared/src/types/annotation.ts` - Stroke interface with color field
- `packages/client/src/stores/annotationStore.ts` - Stroke storage
- `docs/architecture.md#Implementation Patterns` - Token metadata structure

### Implementation Approach

1. **Define palette first** - Create shared constants with tests
2. **Server-side assignment** - Add color to token generation
3. **Client-side extraction** - Get color from participant metadata
4. **Stroke integration** - Use color in stroke creation
5. **UI display** - Show color in participant list
6. **Visibility verification** - Manual testing on various backgrounds

### Color Selection Rationale

The 5 colors were chosen for:
1. **High visibility** - All colors are bright, saturated (not pastels)
2. **Distinctiveness** - Each color is clearly different from others
3. **Accessibility** - Works on both light and dark backgrounds
4. **Familiarity** - Common annotation/marker colors
5. **Brand-neutral** - No specific product associations

### Dependencies

- **Story 4.3:** Local stroke drawing - DONE (provides stroke infrastructure)
- **Story 4.7:** DataTrack annotation sync - DONE (provides sync with color field)
- **Story 2.1:** Room creation API - DONE (provides token generation)

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story 4.10: Assign Unique Colors Per Participant]
- [Source: docs/epics/epic-4-real-time-annotations.md#Story 4.10]
- [Source: docs/architecture.md#Authentication Pattern] - Token metadata structure
- [Source: docs/prd.md#FR34] - Each participant's annotations display in distinct color

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-20 | SM Agent | Initial draft created from Epic 4 tech spec with learnings from Story 4.9 |
