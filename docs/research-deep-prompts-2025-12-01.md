# Deep Research Prompts: NAMELESS

**Generated:** 2025-12-01
**Created by:** BMad (Analyst)
**Purpose:** Ready-to-use prompts for Perplexity, ChatGPT Deep Research, Gemini, or Claude

---

## How to Use These Prompts

1. Copy the prompt in the code block
2. Paste into your AI research tool of choice
3. Follow up with clarifying questions as needed

**Best Platforms:**
- **Perplexity Pro** - Best for real-time web data
- **ChatGPT Deep Research** - Best for comprehensive analysis
- **Gemini Deep Research** - Good for Google ecosystem data
- **Claude Projects** - Best for iterative refinement

---

## Prompt 1: Rust Screen Capture Implementation

### Use When
You need to implement the native sidecar for screen capture on macOS/Windows/Linux.

### Research Prompt (Copy & Paste)

```
I'm building a cross-platform desktop app (Tauri + Rust) that needs high-quality screen capture for a video conferencing application. I need to understand:

CONTEXT:
- Building an open-source Zoom/Tuple alternative called NAMELESS
- Using Tauri 2.0 for the desktop shell
- LiveKit for WebRTC infrastructure
- Target: 1080p minimum, 4K stretch goal
- macOS WKWebView doesn't support getDisplayMedia, so I need native capture

RESEARCH QUESTIONS:
1. What are the best Rust crates for cross-platform screen capture in 2024-2025?
   - Compare: xcap, scrap, captrs, screenshots-rs
   - Performance benchmarks if available
   - Platform-specific limitations

2. How do I capture screen at 4K/5K resolution efficiently?
   - Memory management considerations
   - Frame rate vs resolution tradeoffs
   - GPU acceleration options in Rust

3. How do I encode captured frames for WebRTC streaming?
   - VP9 vs AV1 encoding in Rust
   - Integration with LiveKit's track API
   - Recommended bitrates for screen content

4. What's the architecture for a Tauri sidecar handling screen capture?
   - IPC between Tauri and sidecar
   - Permission handling (macOS screen recording permission)
   - Graceful fallback strategies

5. How do RustDesk and similar projects handle this?
   - Architecture patterns worth copying
   - Lessons learned from production deployments

OUTPUT FORMAT:
- Provide code examples where relevant
- Link to documentation and GitHub repos
- Include performance considerations
- Highlight platform-specific gotchas

Please search for the most recent (2024-2025) information, as this ecosystem evolves quickly.
```

---

## Prompt 2: LiveKit Advanced Configuration

### Use When
You need to optimize LiveKit for screen sharing quality and annotations.

### Research Prompt (Copy & Paste)

```
I'm building a video conferencing app focused on pair programming and code review. I'm using LiveKit as my WebRTC infrastructure. I need advanced configuration guidance.

CONTEXT:
- App: Open-source meeting platform with real-time screen annotations
- Primary use case: Developers sharing screens with small code fonts
- Target: Crisp, readable text - compression artifacts are the enemy
- Annotation overlay needs to be synced < 200ms across participants

RESEARCH QUESTIONS:
1. Optimal LiveKit configuration for screen sharing quality
   - What codec settings maximize text clarity? (VP9/AV1 vs H264)
   - Recommended bitrate for 1080p/1440p/4K screen content
   - How to configure contentHint for "text" vs "detail"
   - Simulcast configuration for screen shares

2. Custom video tracks in LiveKit
   - How to publish a custom video track (from native capture, not browser)
   - Frame timing and synchronization
   - Handling variable frame rates from screen capture

3. Data channels for annotations
   - Best practices for real-time annotation sync
   - Message format for drawing primitives (lines, circles, arrows)
   - Handling late joiners (annotation state sync)
   - Latency optimization for drawing data

4. Selective forwarding and bandwidth management
   - How does LiveKit's SFU handle screen share vs video
   - Prioritizing screen share quality over webcam
   - Adaptive bitrate behavior for screen content

5. Self-hosted LiveKit optimization
   - Hardware recommendations for self-hosted deployments
   - Scaling considerations for small teams (2-10 users)
   - Network configuration for lowest latency

OUTPUT FORMAT:
- Provide LiveKit SDK code examples (JavaScript/TypeScript)
- Link to relevant LiveKit documentation
- Include server-side configuration if relevant
- Real-world performance numbers if available

Please focus on 2024-2025 LiveKit versions and features.
```

---

## Prompt 3: Open Source Monetization Deep Dive

### Use When
You want to refine your business model and pricing strategy.

### Research Prompt (Copy & Paste)

```
I'm building an open-source video conferencing tool (Apache 2.0 license) and need to understand monetization strategies that have worked for similar projects.

CONTEXT:
- Product: Self-hosted meeting platform with real-time annotations
- License: Apache 2.0 (permissive, allows commercial use)
- Target: Developer teams, design teams, IT support
- Positioning: "Premium feel, $0 price" for community edition
- Competition: Jitsi (open source, no annotations), Tuple ($30/user, closed source)

RESEARCH QUESTIONS:
1. Open-core model deep dive
   - What features should be in free vs paid tiers?
   - How do Mattermost, GitLab, and HashiCorp split features?
   - What's the conversion rate from free to paid typically?
   - How to avoid community backlash when gating features

2. Enterprise sales for open source
   - What do enterprises actually pay for? (Support, SLAs, compliance?)
   - Typical enterprise contract sizes for collaboration tools
   - Sales cycle length and process
   - Do you need a sales team or can you do PLG?

3. Managed cloud offering economics
   - Cost to run per-user for video conferencing
   - Margin expectations for SaaS vs self-hosted support
   - How do you price managed vs self-hosted?

4. Case studies: Similar companies
   - Mattermost: How did they grow to $33M ARR?
   - Element (Matrix): What's their enterprise pitch?
   - Jitsi/8x8: Why hasn't Jitsi been more monetized?
   - Cal.com, Supabase: Modern open-source playbooks

5. Pricing psychology
   - Should I start with higher prices and discount, or low and increase?
   - How important is a free tier vs free trial?
   - Per-seat vs flat rate vs usage-based

OUTPUT FORMAT:
- Specific revenue numbers where available
- Pricing page examples worth studying
- Timeline from launch to first revenue
- Common mistakes to avoid

Please include recent (2024-2025) data and examples where possible.
```

---

## Prompt 4: Developer Tool Go-To-Market

### Use When
You're planning your launch and growth strategy.

### Research Prompt (Copy & Paste)

```
I'm launching an open-source developer tool and need a go-to-market strategy specifically for the developer audience.

CONTEXT:
- Product: Open-source video conferencing with screen annotations
- Target: Remote software developers and technical teams
- Differentiator: "Pair programming where you can actually point at the code"
- Budget: Bootstrapped, minimal marketing spend
- Goals: 500 GitHub stars in first 3 months, 100 active teams in 6 months

RESEARCH QUESTIONS:
1. GitHub-first launch strategy
   - How to write a README that converts visitors to stars?
   - Best time/day to post on Hacker News?
   - How to get featured on GitHub Trending?
   - Documentation as marketing (what works?)

2. Developer community channels
   - Which subreddits are worth posting to? (not just r/programming)
   - Discord/Slack communities for developers
   - Twitter/X developer accounts worth engaging
   - Dev.to, Hashnode, Medium - which platform matters?

3. Content marketing for developers
   - What types of technical blog posts drive adoption?
   - Video content: demos, tutorials, or both?
   - Comparison posts (NAMELESS vs Zoom vs Jitsi) - do they work?
   - SEO keywords worth targeting

4. Product Hunt and similar launches
   - Is Product Hunt still relevant for dev tools in 2025?
   - How to prepare for a successful launch
   - Other launch platforms worth considering

5. Early adopter acquisition
   - How to find and recruit beta testers
   - Incentives that work for developers (not discounts)
   - Building in public: worth it?
   - Open source contributor recruitment

OUTPUT FORMAT:
- Specific examples of successful developer tool launches
- Templates or frameworks I can follow
- Metrics to track at each stage
- Common mistakes to avoid

Please focus on 2024-2025 strategies that still work, not outdated playbooks.
```

---

## Prompt 5: WebRTC Annotation Architecture

### Use When
You need to design the real-time annotation system.

### Research Prompt (Copy & Paste)

```
I'm designing a real-time annotation system for screen sharing in a video conferencing app. Users need to draw on shared screens and see each other's drawings instantly.

CONTEXT:
- Built on LiveKit (WebRTC)
- Target latency: < 200ms from draw to visible on all clients
- Drawing tools: freehand, lines, arrows, circles, rectangles, text
- Must work with screen sharing, not separate whiteboard
- Annotations appear as overlay on the shared screen
- Need to handle: new joiners, reconnection, multiple annotators

RESEARCH QUESTIONS:
1. Architecture patterns for collaborative drawing
   - CRDT vs OT for real-time sync?
   - How do Figma, Miro, Excalidraw handle this?
   - Is LiveKit DataChannel the right transport?
   - Alternatives: WebSocket, custom signaling

2. Coordinate system design
   - How to map drawing coordinates to screen pixels?
   - Handling different screen resolutions between participants
   - Scaling annotations when shared screen resolution changes
   - Retina/HiDPI considerations

3. State synchronization
   - How to sync existing annotations to late joiners?
   - Delta updates vs full state sync
   - Handling out-of-order messages
   - Conflict resolution if two users draw simultaneously

4. Rendering performance
   - Canvas vs SVG for annotation layer?
   - Frame rate for smooth drawing
   - Memory management for long sessions with many drawings
   - Garbage collection / clearing old annotations

5. Existing implementations to study
   - How does Zoom implement annotation?
   - Tuple's annotation approach
   - Open-source collaborative drawing libraries
   - Tldraw, Excalidraw architecture

OUTPUT FORMAT:
- Architecture diagrams or pseudocode
- Message format examples (JSON schema)
- Performance benchmarks if available
- Libraries/frameworks worth using

Please include technical implementation details suitable for a senior developer.
```

---

## Prompt 6: Tauri 2.0 Production Best Practices

### Use When
You need to ship a production-quality Tauri app.

### Research Prompt (Copy & Paste)

```
I'm building a production desktop application with Tauri 2.0 and need best practices for shipping a reliable, polished app.

CONTEXT:
- App: Video conferencing with screen sharing
- Platforms: macOS, Windows, Linux
- Size constraints: Want to stay under 20MB installer
- Performance: < 500ms startup, low memory footprint
- Features: System tray, auto-update, deep links, notifications

RESEARCH QUESTIONS:
1. Tauri 2.0 production setup
   - Recommended project structure for complex apps
   - TypeScript + React best practices with Tauri
   - State management between frontend and Rust backend
   - Error handling and logging patterns

2. Platform-specific concerns
   - macOS: Code signing, notarization, App Store considerations
   - Windows: Code signing, SmartScreen, installer options
   - Linux: AppImage vs deb vs snap vs flatpak
   - Which platforms to prioritize?

3. Auto-update implementation
   - Tauri updater vs custom solution
   - Update server requirements
   - Delta updates to reduce bandwidth
   - Handling update failures gracefully

4. Performance optimization
   - Reducing bundle size (tree-shaking, compression)
   - Startup time optimization techniques
   - Memory profiling in Tauri apps
   - Lazy loading strategies

5. Testing and CI/CD
   - Testing Tauri apps (unit, integration, e2e)
   - Cross-platform CI/CD setup (GitHub Actions)
   - Automated builds and signing
   - Beta distribution strategies

6. Common pitfalls and bugs
   - Known Tauri 2.0 issues to watch for
   - WebView differences across platforms
   - Permission handling (camera, microphone, screen recording)
   - Crash reporting and debugging in production

OUTPUT FORMAT:
- Code examples and configuration snippets
- Recommended plugins and crates
- CI/CD workflow examples
- Real-world lessons from production Tauri apps

Please focus on Tauri 2.0 (released late 2024) specifically, not Tauri 1.x.
```

---

## Quick Reference: Which Prompt to Use

| Research Need | Prompt # |
|--------------|----------|
| Building screen capture sidecar | **1** |
| Optimizing video quality | **2** |
| Pricing and business model | **3** |
| Launch and marketing | **4** |
| Annotation feature design | **5** |
| Tauri production deployment | **6** |

---

## Platform Tips

### Perplexity Pro
- Best for: Real-time web data, current pricing, recent news
- Tip: Use "Focus: Academic" for technical papers

### ChatGPT Deep Research
- Best for: Comprehensive multi-source analysis
- Tip: It will ask clarifying questions - answer them for better results

### Gemini Deep Research
- Best for: Google ecosystem data, YouTube content
- Tip: Good for finding tutorials and video content

### Claude Projects
- Best for: Iterative refinement, code review
- Tip: Upload your codebase for context-aware answers

---

## Document Information

**Workflow:** BMad Research - Deep Prompt Generator
**Generated:** 2025-12-01
**Prompts Created:** 6
**Topics Covered:** Technical Architecture, Business Model, GTM, Feature Design

---

_These research prompts were generated using the BMad Method Research Workflow, optimized for 2025 AI research tools._
