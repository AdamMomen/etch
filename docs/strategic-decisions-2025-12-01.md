# Strategic Decisions & Updated Roadmap: NAMELESS

**Date:** 2025-12-01
**Based on:** Market, Competitive, User, and Domain Research
**Purpose:** Consolidate research findings into actionable decisions

---

## Executive Summary

Research validates the core vision while revealing key technical and strategic adjustments needed. This document consolidates all decisions that need to be made or have been informed by research.

**Key Research Findings:**
1. **Market opportunity is real** - $340-500M SAM, 57% of enterprises prefer self-hosted
2. **Jitsi has clear gaps** - No annotations, quality issues, declining parent company
3. **Tuple proves premium pricing** - Developers pay $30/user for quality tools
4. **Tauri needs a sidecar** - macOS WKWebView doesn't support `getDisplayMedia()`
5. **Premium = fast + crisp + frictionless** - Not 5K resolution, but "text is readable"

---

## Decisions To Make

### Decision 1: Screen Capture Architecture

**Current Architecture (from architecture.md):**
> Use WebRTC `getDisplayMedia()` in WebView

**Research Finding (Domain Research):**
> macOS WKWebView doesn't support `getDisplayMedia`. This is a blocker.

**Options:**

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| **A: Rust Sidecar** | Works on all platforms, native performance | More complex architecture | Medium |
| **B: Electron Fallback** | Screen capture just works | Slow startup (1-2s), heavy (85MB) | Low |
| **C: Windows-only MVP** | Ship faster | Lose 50%+ of developer market | Low |

**Recommendation:** Option A - Rust Sidecar

**Rationale:**
- Tauri still delivers <500ms startup (research validated)
- Sidecar pattern is proven (Hopp uses exactly this approach)
- Keeps "premium feel" goal intact
- Can use `xcap` or `scrap` Rust crates

**Decision Required:** ☐ Confirm Rust Sidecar approach for macOS screen capture

---

### Decision 2: Resolution Strategy

**Current PRD:**
> "Shared screen displays at appropriate quality for content visibility" (FR20)

**Research Finding (User Research + Domain Research):**
> - 720p: "Hard to read" - unusable
> - 1080p with high bitrate: "Workable" - sufficient for MVP
> - 4K-5K: "Premium" - nice to have, not critical
> - The real issue is **compression**, not resolution

**Recommendation:**

| Phase | Resolution | Bitrate | Codec |
|-------|------------|---------|-------|
| **MVP** | 1080p | 4-6 Mbps | VP9 |
| **v1.1** | 1440p option | 6-10 Mbps | VP9 |
| **Future** | 4K | 10-15 Mbps | VP9/AV1 |

**Key Insight:** Focus on **high bitrate + VP9** rather than raw resolution. Crisp text at 1080p beats blurry text at 4K.

**Decision Required:** ☐ Confirm 1080p MVP with VP9 codec focus

---

### Decision 3: Pricing Strategy

**Current PRD:**
> Success measured by "community adoption and product quality, not revenue"

**Research Finding (Market Research):**
> - Open-core model works: GitLab ($750M), Mattermost ($33M ARR)
> - Tuple charges $30/user and developers pay it
> - Self-hosted segment is large and growing (18.5% CAGR)

**Recommendation: Open Core Model**

| Tier | Price | Features |
|------|-------|----------|
| **Community** | $0 | Full MVP features, self-hosted |
| **Pro** | $12/user/mo | Priority support, SSO, recording |
| **Enterprise** | $8K-30K/year | Air-gapped, SLA, dedicated support |
| **Cloud** | Usage-based | Managed hosting option |

**Strategy:** "Premium feel, $0 price" for community edition. Monetize support and enterprise features.

**Decision Required:** ☐ Confirm open-core monetization approach

---

### Decision 4: Positioning & Messaging

**Current PRD:**
> "Open-source, self-hosted meeting platform with real-time annotations"

**Research Finding (User Research):**
> - Developers hate: "50 lines of barely legible code"
> - Developers want: "Point at exactly what I mean"
> - Premium = fast + crisp + no friction

**Recommendation:**

**Don't say:** "Open-source video conferencing"
**Say:** "Pair programming where you can actually point at the code"

**Tagline Options:**
1. "Draw on what you see. Everyone sees it."
2. "The pointing finger moment, open source."
3. "Premium screen sharing, $0 price."

**Decision Required:** ☐ Choose primary tagline/positioning

---

### Decision 5: MVP Platform Scope

**Current PRD:**
> macOS + Windows MVP, Linux post-MVP

**Research Finding (Domain Research):**
> - Tauri sidecar adds complexity
> - macOS screen capture requires native solution
> - Windows WebView2 has better WebRTC support

**Options:**

| Option | Platforms | Risk | Speed |
|--------|-----------|------|-------|
| **A: Windows First** | Windows MVP → macOS v1.1 | Miss Mac developers | Fastest |
| **B: Both Simultaneously** | macOS + Windows MVP | Sidecar complexity | Medium |
| **C: macOS First** | macOS MVP → Windows v1.1 | Miss Windows developers | Medium |

**Recommendation:** Option B - Both Simultaneously

**Rationale:**
- Sidecar is needed anyway for consistency
- macOS developers are primary target (Tuple is Mac-first)
- Parallel development prevents divergence

**Decision Required:** ☐ Confirm macOS + Windows simultaneous MVP

---

### Decision 6: Go-To-Market Strategy

**Current PRD:**
> 500 GitHub stars, 50 deployments, 10 contributors

**Research Finding (Market + User Research):**
> - Developer tools get acquired (CoScreen → Datadog, Around → Miro)
> - GitHub stars = social proof = higher valuation
> - Hacker News launch is critical for dev tools

**Recommendation:**

| Phase | Focus | Target |
|-------|-------|--------|
| **Pre-launch** | Build in public, early demos | 100 waitlist signups |
| **Launch** | GitHub + Hacker News + Dev.to | 500 stars, trending |
| **Month 1-3** | Content marketing, comparisons | 1,000 stars |
| **Month 3-6** | Enterprise outreach | 10 paying customers |

**Decision Required:** ☐ Confirm GTM approach and timeline

---

## Confirmed Decisions (From Research)

These decisions are validated by research and should proceed:

### ✅ Tauri 2.0 Framework
- **Research confirms:** <500ms startup, 2.5MB bundle
- **Status:** Proceed with current architecture

### ✅ LiveKit for WebRTC
- **Research confirms:** $345M valuation, OpenAI uses them, $83M funding
- **Status:** Proceed with current architecture

### ✅ Annotation as Core Differentiator
- **Research confirms:** No open-source video tool has integrated annotations
- **Status:** Maintain as #1 priority feature

### ✅ Self-Hosted First
- **Research confirms:** 57-68% of enterprise video is on-premise
- **Status:** Proceed with Docker Compose deployment

### ✅ Developer-First UX
- **Research confirms:** Premium = fast + minimal + keyboard shortcuts
- **Status:** Dark mode default, minimal UI, instant startup

---

## Updated Roadmap

Based on research findings, here's the revised roadmap:

### Phase 1: Foundation (Current - Epic 1-2)
**Goal:** Basic meeting infrastructure

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Monorepo setup | ✅ Done | Epic 1 complete |
| Tauri shell | ✅ Done | Story 1.1 complete |
| Hono API server | ✅ Done | Story 1.2 complete |
| Room create/join | 🚧 In Progress | Epic 2 |

**No changes from research**

---

### Phase 2: Screen Sharing (Epic 3)
**Goal:** Share screen with LiveKit

| Deliverable | Original Plan | Research Update |
|-------------|---------------|-----------------|
| Screen capture | getDisplayMedia() | **Add Rust sidecar for macOS** |
| Resolution | "appropriate quality" | **1080p + VP9 + high bitrate** |
| Floating control bar | ✅ Planned | No change |

**Key Change:** Add screen capture sidecar story

---

### Phase 3: Annotations (Epic 4)
**Goal:** Core differentiator

| Deliverable | Original Plan | Research Update |
|-------------|---------------|-----------------|
| Drawing tools | Pen, highlighter, eraser | No change |
| Latency target | <200ms | No change |
| Rendering | Canvas + Perfect Freehand | No change |

**No changes from research** - This is validated as critical

---

### Phase 4: Polish & Launch (Epic 5-7)
**Goal:** Ship and launch

| Deliverable | Original Plan | Research Update |
|-------------|---------------|-----------------|
| Permissions | Basic roles | No change |
| Recording | Post-MVP | **Move to Pro tier** |
| Auto-update | Post-MVP | **Include in MVP** |
| Linux | Post-MVP | No change |

**Key Change:** Include auto-update in MVP for "premium feel"

---

### Phase 5: Monetization (Post-MVP)
**Goal:** Sustainability

| Deliverable | Timeline | Notes |
|-------------|----------|-------|
| Pro tier launch | v1.1 | $12/user/mo |
| SSO integration | v1.1 | Enterprise requirement |
| Recording & playback | v1.1 | Pro feature |
| Enterprise tier | v1.2 | Custom pricing |
| Managed cloud | v2.0 | Usage-based |

---

## Technical Debt to Address

Research revealed these technical considerations:

### 1. Screen Capture Sidecar
**What:** Rust binary for native screen capture on macOS
**Why:** WKWebView doesn't support getDisplayMedia
**When:** Before macOS testing
**Effort:** 1-2 weeks

### 2. VP9 Optimization
**What:** Configure LiveKit for high-bitrate VP9 screen sharing
**Why:** Text clarity is #1 user complaint
**When:** Epic 3 (Screen Sharing)
**Effort:** 1-2 days

### 3. Codec Fallback
**What:** H264 fallback for older browsers/devices
**Why:** VP9 not universal
**When:** v1.1
**Effort:** 1 day

---

## Risk Register Update

Research identified these risks:

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **macOS screen capture fails** | Medium | High | Rust sidecar ready as primary approach |
| **Jitsi adds annotations** | Low | High | Move fast, first-mover advantage |
| **Zoom improves annotations** | Medium | Medium | Self-hosted differentiator remains |
| **RTO mandates reduce remote work** | High | Medium | Developer segment resists RTO |
| **Enterprise sales cycle slow** | High | Medium | Focus on PLG first |

---

## Action Items

### Immediate (This Week)
1. ☐ Make decision on screen capture architecture (sidecar vs fallback)
2. ☐ Update architecture.md with sidecar design if confirmed
3. ☐ Create new story for Rust sidecar implementation
4. ☐ Confirm positioning/tagline

### Short-term (This Month)
1. ☐ Update PRD with resolution strategy (1080p + VP9)
2. ☐ Add auto-update to MVP scope
3. ☐ Create pricing page design
4. ☐ Set up "build in public" presence (Twitter, blog)

### Medium-term (Next Quarter)
1. ☐ Plan Hacker News launch
2. ☐ Create comparison content (vs Jitsi, vs Zoom)
3. ☐ Set up enterprise outreach process
4. ☐ Implement Pro tier infrastructure

---

## Summary

**Research confirms the vision but refines the execution:**

| Aspect | Before Research | After Research |
|--------|-----------------|----------------|
| **Architecture** | getDisplayMedia only | + Rust sidecar for macOS |
| **Resolution** | "appropriate" | 1080p + VP9 + high bitrate |
| **Positioning** | "Open-source meeting platform" | "Point at the code" |
| **Monetization** | Community focus | Open-core, $12-30K/user tiers |
| **Differentiation** | Annotations | Annotations + premium feel + $0 |

**Bottom line:** The market opportunity is validated. The core architecture is sound but needs a sidecar for macOS. Focus on "premium feel at $0 price" to make migration a no-brainer.

---

**Next Steps:**
1. Review and approve decisions above
2. Update PRD/architecture with confirmed changes
3. Continue with Epic 2 development
4. Plan sidecar implementation for Epic 3

---

_This strategic decisions document consolidates findings from 5 research reports (market, competitive, user, domain, deep prompts) generated on 2025-12-01._
