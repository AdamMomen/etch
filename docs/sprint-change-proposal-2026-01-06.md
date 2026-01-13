# Sprint Change Proposal - Public Showcase Readiness

**Date:** 2026-01-06
**Project:** Etch (etch)
**Author:** John (PM Agent) + BMad
**Trigger:** Public showcase deadline (this week) - live demo to potential users

---

## 1. Issue Summary

### Problem Statement

A live demo showcase to potential users is scheduled for this week. While the core MVP (Epics 1-4: Foundation, Meetings, Screen Sharing, Annotations) is functionally complete, several production reliability bugs could cause demo failure. Additionally, a list of features and documentation polish items was identified, requiring prioritization against the hard deadline.

### Context

- **When discovered:** Pre-showcase planning phase
- **Discovery method:** User-initiated course correction to triage work against deadline
- **Severity:** High - Live demo has no room for critical failures
- **Scope:** 6 identified bugs, 8 feature requests, 2 documentation items

### Supporting Evidence

**Demo Format Risk Profile:**
- Live demo is highest-risk showcase format (cannot retry, no editing)
- Core user journey: Join meeting → Share screen → Annotate
- Any failure in this path = demo dead on arrival

**Current State:**
- ✅ Epics 1-4 complete (Foundation, Basic Meetings, Screen Share, Annotations)
- ⚠️ Epic 5 partial (Permissions: 2/8 stories done)
- ❌ Epic 6-7 backlog (Connection Resilience, Self-Hosting)

---

## 2. Impact Analysis

### Epic Impact

**Epic 2 (Basic Meeting Experience) - AFFECTED**

**Gaps identified:**
1. **Production room join failure** - Inconsistent identity/name from device breaks authentication
   - Impacts: FR2 (join room), FR3 (display name), FR47 (token validation)
   - Severity: 🔴 CRITICAL - Users cannot join rooms in production

2. **Retry button broken for closed rooms** - Cannot recover from closed room state
   - Impacts: FR6 (leave meeting), room lifecycle management
   - Severity: 🔴 CRITICAL - No recovery path if demo room closes unexpectedly

3. **No room existence validation** - Joining non-existent room shows confusing error
   - Impacts: FR2 (join room), FR47 (error handling)
   - Severity: 🔴 CRITICAL - Poor error UX creates confusion during demo

**Epic 6 (Connection Resilience) - NOT STARTED, PARTIALLY RELEVANT**

4. **Page refresh loses session** - Identity persistence not implemented
   - Impacts: FR48-FR51 (connection state, reconnection)
   - Severity: 🟡 HIGH - Accidental refresh breaks demo, but avoidable
   - **Decision:** Defer post-demo (nice-to-have safety net, not critical path)

### Artifact Conflicts

**PRD Impact:** ✅ No conflict
- All bugs fall within existing MVP functional requirements (FR2, FR3, FR6, FR47)
- No scope expansion needed

**Architecture Impact:** ✅ Minimal
- Authentication flow: Identity consistency fix
- Room lifecycle: Retry button state handling
- No major architectural changes required

**UI/UX Impact:** ✅ Minor
- Error messaging improvements (room validation)
- Retry button behavior refinement
- No flow or wireframe changes needed

**Deployment/Docs:** ⏸️ Deferred
- Docker compose, README polish, logo, onboarding → Post-demo
- These are Epic 7 (Self-Hosting) items, not MVP-blocking

### Story Impact

**Current Stories:** No existing stories require modification

**New Stories Needed:**
1. Bug Fix: Production room join with consistent identity
2. Bug Fix: Retry button reopens closed rooms
3. Bug Fix: Validate room existence before join attempt

**Future Stories Affected:** None (bugs are isolated implementation gaps)

---

## 3. Recommended Approach

### Selected Path: **Option 1 - Direct Adjustment**

**Strategy:** Add 3 focused bug-fix stories within Epic 2 scope for Tuesday execution

### Why This Approach

**Pros:**
- ✅ Maintains timeline: 3 fixes fit "Bugs Day" schedule (4-6 hours total)
- ✅ Low risk: Focused fixes, no architectural changes
- ✅ Preserves MVP: No scope creep, addresses existing requirements
- ✅ Demo-ready outcome: Core user journey becomes reliable

**Cons:**
- ⚠️ Defers nice-to-haves: Features and polish pushed post-demo
- ⚠️ No identity persistence safety net: Accidental refresh still breaks session

**Risk Assessment:**
- **Technical risk:** LOW - Well-understood bugs with clear fix paths
- **Timeline risk:** LOW - 3 stories = ~6 hours max on Tuesday
- **Quality risk:** LOW - Fixes target demo-critical paths only

**Alternative Considered (and rejected):**
- Option 3 (MVP Review): Not needed - MVP is functionally complete, just needs bug fixes

### Effort Estimate

| Story | Effort | Confidence |
|-------|--------|------------|
| Fix production join with identity consistency | 2-3 hours | High |
| Fix retry button for closed rooms | 1-2 hours | High |
| Add room existence validation | 1 hour | High |
| **Total** | **4-6 hours** | **High** |

**Buffer:** Tuesday is dedicated "Bugs Day" - sufficient time allocation

### Timeline Impact

**Tuesday:** Bug fixes (6 hours allocated)
**Wednesday-Friday (partial):** Feature polish, README, testing
**Demo Day:** Ready with stable core journey

**No slippage expected** - Bugs are scoped and understood

---

## 4. Detailed Change Proposals

### Story 1: Fix Production Room Join with Consistent Identity

**Section:** Epic 2 - Basic Meeting Experience
**Functional Requirement:** FR2, FR3, FR47

**Current Behavior:**
- Room join fails in production due to inconsistent identity/name generation from device
- Token validation or participant identity mismatch causes authentication failure

**Proposed Change:**
```
BEFORE:
- Device generates identity inconsistently
- Join fails with cryptic error

AFTER:
- Consistent identity generation across device contexts
- Successful room join with proper participant name display
- Clear error message if auth fails for other reasons
```

**Implementation Notes:**
- Investigate identity/token generation in production build
- Ensure device name/ID is consistently retrieved
- Add logging for auth flow debugging
- Test on production build configuration

**Acceptance Criteria:**
1. User can join room in production build with consistent identity
2. Participant name displays correctly in room
3. Token validation succeeds on first attempt
4. Error messages are clear if auth fails for valid reasons

**Rationale:** Demo dead on arrival if users cannot join rooms. Highest priority fix.

---

### Story 2: Fix Retry Button for Closed Rooms

**Section:** Epic 2 - Basic Meeting Experience
**Functional Requirement:** FR6 (leave meeting recovery)

**Current Behavior:**
- Retry button doesn't work when room is closed
- User stuck in error state with no recovery path

**Proposed Change:**
```
BEFORE:
- Room closes → Retry button does nothing
- User must restart application

AFTER:
- Room closes → Retry button reopens/recreates room if needed
- Graceful recovery without application restart
```

**Implementation Notes:**
- Check room state before retry attempt
- If room closed: Trigger room creation flow
- If room exists: Attempt rejoin
- Update UI to reflect room reopening status

**Acceptance Criteria:**
1. Retry button detects closed room state
2. Button creates new room if previous room closed
3. User successfully rejoins (new or existing room)
4. UI shows clear feedback during retry process

**Rationale:** If demo room closes unexpectedly, need recovery path without restarting app in front of audience.

---

### Story 3: Validate Room Existence Before Join

**Section:** Epic 2 - Basic Meeting Experience
**Functional Requirement:** FR2, FR47

**Current Behavior:**
- Clicking "Join Meeting" with non-existent room ID shows confusing error
- User doesn't know if room doesn't exist or if there's a connection issue

**Proposed Change:**
```
BEFORE:
- Join attempt → Generic connection error

AFTER:
- Validate room exists before join attempt
- Clear error: "Room XYZ does not exist. Please check the room ID."
- Suggest creating new room or checking link
```

**Implementation Notes:**
- Add API endpoint or LiveKit check for room existence
- Call validation before join attempt
- Display user-friendly error for non-existent rooms
- Differentiate from other connection errors

**Acceptance Criteria:**
1. System validates room exists before attempting join
2. Non-existent room shows specific error message
3. Error suggests actionable next steps (check link, create room)
4. Validation completes quickly (< 2 seconds)

**Rationale:** During demo, joining non-existent room should show clear error, not confuse audience with technical jargon.

---

### Test Item: Audio Volume Slider Verification

**Section:** Epic 2 - Basic Meeting Experience
**Functional Requirement:** FR14

**Action Required:**
- Manually test audio volume slider functionality before demo
- If working: Document as verified
- If broken: Document known issue, workaround, defer fix

**Why Manual Test (Not Fix):**
- Non-critical: Volume adjustment is nice-to-have, not demo-breaking
- Workaround exists: System volume control
- Time-boxed: 30 minutes test, don't debug if broken

**Acceptance Criteria:**
1. Test slider with multiple participants
2. Verify volume changes apply correctly
3. Document status (working/broken/workaround)

---

### Deferred Items (Post-Demo)

**Features (8 items):**
- Hide Highlighter from toolbar
- Docker compose file creation
- Project logo creation
- Cloud service website (app.etch.momen.earth)
- Toolbars follow screen overlay borders
- Onboarding/signup prompt for production
- Personal website content
- Coolify service setup guide

**Rationale for Deferral:**
- Not MVP-blocking (Epic 7 scope)
- Visual/deployment polish, not functional requirements
- Can be completed post-demo without impacting core value prop

**Documentation (2 items):**
- Polished README with self-hosting focus
- Coolify setup webpage guide

**Rationale for Deferral:**
- Epic 7 (Self-Hosting & Deployment) scope
- Demo doesn't require published docs
- Can prepare docs post-demo for public release

---

## 5. Implementation Handoff

### Change Scope Classification

**Classification:** 🟡 **Minor**

**Justification:**
- 3 focused bug fixes within existing epic structure
- No architectural changes or scope expansion
- No backlog reorganization needed
- Direct implementation by development team

### Handoff Plan

**Primary Recipient:** Development Team (DEV agent)

**Responsibilities:**
1. Implement 3 bug-fix stories on Tuesday "Bugs Day"
2. Write tests to verify each fix
3. Perform manual validation of audio volume slider
4. Update Story 5.2 completion status if needed

**Timeline:**
- **Tuesday (Jan 7):** Execute all 3 bug fixes + audio test
- **Wednesday-Friday:** Available for feature polish if time permits
- **Demo Day:** Ready with stable core journey

### Success Criteria

**Demo-Ready Definition:**
1. ✅ Users can join rooms in production build
2. ✅ Retry button recovers from closed room state
3. ✅ Non-existent room shows clear error message
4. ✅ Core user journey (join → share → annotate) is reliable
5. 📋 Audio volume slider status documented

**Post-Demo Next Steps:**
1. Execute feature list (Docker, logo, README, etc.)
2. Implement identity persistence (Epic 6 story)
3. Continue Epic 5 (Permissions) stories
4. Begin Epic 7 (Self-Hosting) when ready

---

## Summary

**Issue:** Public showcase deadline requires prioritizing demo-critical bugs over features
**Impact:** Epic 2 has 3 production reliability gaps; Epics 6-7 features can be deferred
**Approach:** Direct adjustment - Add 3 focused bug-fix stories for Tuesday execution
**Outcome:** Stable core user journey for live demo, features deferred to post-demo
**Handoff:** Development team implements 3 stories (~6 hours) on Tuesday "Bugs Day"

---

**Approval Status:** ✅ APPROVED by BMad (2026-01-06)

**Next Steps:**
1. ✅ Review complete
2. ✅ Approved for implementation
3. ➡️ Hand off to DEV agent for Tuesday execution
4. ⏳ Validate fixes before demo day

**Handoff Details:**
- **Recipient:** Development Team (DEV agent)
- **Timeline:** Tuesday (Jan 7) - "Bugs Day"
- **Deliverables:** 3 bug fixes + audio slider test
- **Success Criteria:** Core user journey (join → share → annotate) is reliable for live demo
