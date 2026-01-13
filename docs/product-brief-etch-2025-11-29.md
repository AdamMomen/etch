# Product Brief: Etch

**Date:** 2025-11-29
**Author:** BMad
**Context:** Open-Source Developer Tool / B2B SaaS

---

## Executive Summary

Etch is an open-source, self-hosted meeting platform with real-time screen annotations. It addresses the gap between proprietary tools like Zoom (feature-rich but closed) and open alternatives like Jitsi (open but lacking annotation capabilities).

**Core value proposition:** Draw directly on shared screens during meetings with sub-200ms latency, fully self-hosted under Apache 2.0.

**Target users:** Developer teams (code reviews, debugging), design teams (prototype feedback), and IT support (remote troubleshooting).

**Technical approach:** Separates media transport (LiveKit) from annotation logic (vector events via DataTracks), with local compositing in a desktop client optimized for performance (technology TBD based on best tool for the job - native frameworks preferred over Electron for latency-critical rendering).

**MVP scope:** Desktop app with video/audio/screen-share, real-time annotation overlay, role-based permissions, and late-joiner sync.

**Success metric:** Community adoption - targeting 500+ GitHub stars and 50+ self-hosted deployments as initial validation

---

## Core Vision

### Problem Statement

Real-time visual communication during screen sharing remains fragmented and locked behind proprietary ecosystems. Platforms like Zoom, Microsoft Teams, Slack, and Miro offer annotation features that are:

- **Closed-source and vendor-locked** - Users are trapped in expensive ecosystems with no control over their data or deployment
- **Laggy and unreliable** - Many implementations use browser overlays or heavy media pipelines introducing noticeable delay
- **Limited customization** - SaaS platforms restrict enterprise customization, compliance requirements, and data sovereignty

Developers, designers, educators, and enterprises increasingly demand self-hosted collaboration tools for privacy and compliance, yet no open-source solution delivers the smooth, real-time annotation experience that proprietary tools struggle to achieve.

### Problem Impact

- **Enterprises** face compliance risks using closed SaaS platforms for sensitive internal communications
- **Educators** pay premium subscriptions for basic annotation features when teaching remotely
- **Design teams** experience frustrating lag when reviewing prototypes in real-time
- **Remote support technicians** lack precise tools to guide users visually on their screens
- **Developers** cannot embed or extend annotation capabilities in their own products

### Why Existing Solutions Fall Short

| Solution | Gap |
|----------|-----|
| Zoom | Proprietary, expensive enterprise licensing, no self-hosting |
| Microsoft Teams | Locked to Microsoft ecosystem, limited annotation tools |
| Around Co (Miro) | Acquired, uncertain future, SaaS-only |
| Jitsi Meet | Open-source but lacks real-time annotation capabilities |
| Miro/FigJam | Whiteboard-focused, not screen annotation |

### Proposed Solution

Etch is an open-source, self-hosted meeting platform with real-time screen annotations built on modern WebRTC infrastructure. The architecture separates media transport from interaction logic:

- **LiveKit backend** handles all WebRTC media and data transport
- **Annotation system** synchronizes lightweight vector events (not pixel data)
- **Desktop client** composites video and annotation overlays locally for maximum responsiveness

This separation enables modularity, scalability, and future portability while delivering annotation latency under 200ms.

### Key Differentiators

1. **Open-source core (Apache 2.0)** - Community adoption + commercial sustainability
2. **Self-hostable** - Full control over data, deployment, and compliance
3. **Architecture-first design** - Clean separation of media, annotation, and presentation layers
4. **Developer-friendly** - Reusable annotation protocol and overlay engine for embedding in other products
5. **Desktop-native performance** - Best-tool-for-the-job approach; native frameworks (Tauri, Swift, Rust) preferred over Electron for latency-critical rendering

---

## Target Users

### Primary Users

**Developer Teams**
- Software engineers doing code reviews, debugging sessions, and pair programming
- Frustrated with screen-sharing tools that don't let them quickly mark up what they're seeing
- Value open-source, self-hostable tools they can customize and integrate
- Current behavior: Verbal descriptions like "no, the other button... up... left a bit" or switching to separate whiteboard tools
- What they'd value: Drawing directly on shared screens during code reviews, pointing at specific lines, circling UI bugs

**Design Teams**
- UI/UX designers reviewing prototypes, mockups, and design systems
- Need to annotate over live Figma previews, staging environments, or recorded demos
- Current behavior: Taking screenshots, marking up in separate tools, losing context
- What they'd value: Real-time visual feedback during design critiques without leaving the conversation

### Secondary Users

**IT/Support Technicians**
- Technical support staff guiding users through troubleshooting
- Remote IT teams supporting distributed workforces
- Current behavior: "Click the icon that looks like..." or requesting screen control (invasive)
- What they'd value: Drawing arrows and circles directly on the user's screen to guide them step-by-step

---

## Success Metrics

**Primary Focus: Community Adoption**

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| GitHub Stars | 500+ in first 3 months | Visibility and social proof |
| Self-hosted Deployments | 50+ active instances | Real-world validation |
| Contributors | 10+ external PRs merged | Community health |
| Discord/Community Members | 200+ | Engaged user base |

**Product Quality Indicators:**
- Annotation latency consistently < 200ms
- Successful room connections > 95%
- User-reported bugs resolved within 1 week

**Future Commercial Signals (to watch, not optimize for yet):**
- Enterprise inquiries received
- Requests for hosted/managed version
- Support contract interest

---

## MVP Scope

### Core Features

**Phase 1 MVP Capabilities:**
- Self-hosted LiveKit instance deployment
- Electron desktop app (macOS, Windows)
- Create/join meeting rooms with authentication
- Publish audio, video, and screen-share
- Real-time annotation canvas overlay on shared screens
- Drawing tools: pen, highlight, erase, clear-all
- Role-based permissions: host, sharer, annotator, viewer
- Late-joiner sync (see current annotation state)
- DataTrack-based annotation synchronization

**Role Capabilities:**
| Role | Capabilities |
|------|-------------|
| Host | Enable/disable annotations, clear all, manage users |
| Sharer | Share screen, delete any stroke |
| Annotator | Create/delete own strokes |
| Viewer | View only |

### Out of Scope for MVP

- PSTN/phone dial-in
- Browser-based annotation authoring (view-only web is acceptable)
- OS-level native ink overlays
- Complex shapes/whiteboard tools
- Recording and replay
- SSO/org management features

### MVP Success Criteria

- [ ] A developer can self-host Etch and run a meeting within 30 minutes
- [ ] Screen share with annotation works reliably between 2-10 participants
- [ ] Annotation latency is imperceptible (< 200ms)
- [ ] Late joiners see existing annotations immediately
- [ ] Role permissions work correctly (host can clear, annotators can only delete own strokes)
- [ ] README and docs are clear enough for community contributions

### Future Vision

**Phase 2 — Stability & UX:**
- Undo/redo functionality
- Cursor indicators
- Persistent session state
- Enhanced role-based UI

**Phase 3 — Hybrid & Native Evolution:**
- Native overlay helper (Rust/Swift/C++)
- Recording and replay of annotated sessions
- SDK for developers to embed annotation layer
- Advanced tools (rectangles, arrows, text)
- Org features (SSO, teams)
- Web annotation client

---

## Technical Preferences

**Architecture Stack:**

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Media Backend | LiveKit SFU + DataTracks | Proven, low-latency, open license |
| App Server | Node.js or Go | Lightweight control plane, easy token handling |
| Desktop Client | TBD - evaluating options | Performance is priority; considering Tauri (Rust + webview), native Swift/AppKit (macOS), or pure Rust with egui/iced |
| Annotation Channel | DataTrack (WebRTC DataChannel) | Shared low-latency transport |

**Desktop Client Evaluation Criteria:**
- Annotation rendering latency (must be imperceptible)
- Bundle size and memory footprint
- Cross-platform viability (macOS priority, Windows secondary)
- Developer velocity for MVP vs. long-term maintenance
- Native OS integration (screen capture APIs, overlay windows)

**Options under consideration:**
1. **Tauri** - Rust backend + lightweight webview, smaller bundles than Electron
2. **Swift/AppKit** - Native macOS performance, platform-specific
3. **Rust + egui/iced** - Pure native, maximum control, steeper learning curve
4. **Electron** - Fallback if velocity matters more than performance for MVP

**Annotation Protocol Design:**
- Event-driven synchronization (stroke metadata, not pixels)
- Resolution-independent coordinates (normalized to [0,1] space)
- Decentralized rendering (each participant reconstructs locally)
- Ownership control with host moderation capabilities

---

## Market Context

**Competitive Landscape:**

| Solution | Strengths | Gaps | Etch Advantage |
|----------|-----------|------|-------------------|
| **Zoom** | Market leader, polished UX | Proprietary, expensive, no self-host | Open-source, self-hostable |
| **Microsoft Teams** | Enterprise integration | Microsoft lock-in, limited annotations | Platform agnostic |
| **Jitsi Meet** | Open-source, self-hosted | No real-time annotation | Annotation-first design |
| **Miro/FigJam** | Great collaboration tools | Whiteboard-focused, not screen annotation | Screen-share annotations |
| **Around (acquired by Miro)** | Nice UX | Uncertain future, SaaS-only | Community-driven roadmap |

**Market Position:**

Etch sits at the intersection of:
- **Jitsi's openness** (self-hosted, open-source)
- **Zoom's interactivity** (real-time annotations)
- **Developer tooling ethos** (embeddable, extensible)

**Target Niche:** Teams who need real-time visual collaboration but can't or won't use closed SaaS platforms - whether for privacy, compliance, cost, or customization reasons.

**Growth Strategy:**
1. Launch on Hacker News, Reddit (r/selfhosted, r/webdev)
2. Engage developer communities (Discord, GitHub discussions)
3. Create demo videos showing annotation UX vs. competitors
4. Encourage forks and contributions through clean architecture

---

{{#if financial_considerations}}
## Financial Considerations

{{financial_considerations}}
{{/if}}

---

## Risks and Assumptions

**Technical Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| LiveKit dependency | Core functionality relies on external project | LiveKit is Apache 2.0, well-maintained; could fork if needed |
| WebRTC complexity | Browser/OS inconsistencies in media handling | Start desktop-only with controlled environment |
| Desktop framework choice | Wrong pick could mean rewrite later | Spike/prototype annotation layer in top 2 candidates before committing |
| Annotation sync edge cases | Network jitter could cause desync | Implement robust late-join sync, periodic state reconciliation |

**Adoption Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Self-hosting friction | Barrier to entry for non-technical users | Excellent docs, Docker compose one-liner, demo instance |
| Crowded market | Hard to stand out against Zoom/Teams | Focus on open-source niche, developer community |
| Contributor burnout | Solo maintainer risk | Build community early, document architecture for contributors |

**Assumptions:**

- Developers and teams value self-hosted alternatives enough to invest setup time
- Annotation latency < 200ms is achievable with DataTrack approach
- Desktop-first (native or near-native) is acceptable for primary users; web view-only is sufficient for guests
- Apache 2.0 licensing will attract both community and commercial interest
- LiveKit will remain stable and actively maintained

---

_This Product Brief captures the vision and requirements for Etch._

_It was created through collaborative discovery and reflects the unique needs of this open-source developer tool project._

_Next: Use the PRD workflow to create detailed product requirements from this brief._
