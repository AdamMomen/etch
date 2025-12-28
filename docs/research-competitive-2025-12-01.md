# Competitive Intelligence Report: Etch

**Date:** 2025-12-01  
**Prepared by:** BMad (Analyst)  
**Focus:** Jitsi, Tuple, LiveKit  
**Research Type:** Deep Competitive Analysis

---

## Executive Summary

| Competitor | Threat Level | Relationship | Key Insight |
|------------|--------------|--------------|-------------|
| **Jitsi** | Medium | Direct competitor | No annotations, quality issues - your opportunity |
| **Tuple** | Low | Adjacent/inspiration | Proves premium pricing works for devs ($25-30/user) |
| **LiveKit** | None (Partner) | Infrastructure | Use them - $345M valuation, OpenAI customer |

**Strategic Takeaway:** Jitsi leaves a clear gap (no annotations, enterprise struggles). Tuple proves developers pay premium for good tools. LiveKit is your infrastructure layer, not a competitor.

---

## 1. Jitsi Meet - Deep Dive

### Company Overview

| Attribute | Value | Source |
|-----------|-------|--------|
| **Founded** | 2003 | [Crunchbase](https://www.crunchbase.com/organization/jitsi) |
| **Founder** | Emil Ivov | Tracxn |
| **Acquired by** | 8x8 (2018) | [Wikipedia](https://en.wikipedia.org/wiki/8x8) |
| **Previous Owner** | Atlassian (2015-2018) | Wikipedia |
| **Parent Company Revenue** | $715M (FY2024) | [Business Wire](https://www.businesswire.com/news/home/20250203066974/en/8x8-Inc.-Announces-Third-Quarter-Fiscal-Year-2025-Financial-Results) |
| **Parent Stock** | EGHT (NYSE) | Yahoo Finance |
| **IT Spend (Jitsi)** | ~$551K projected | Aberdeen via Tracxn |
| **Companies Using Jitsi** | 240 | [TheirStack](https://theirstack.com/en/technology/jitsi) |

### Business Model

```
Open Source Core (Free) → JaaS Enterprise (Paid via 8x8)
```

- **Jitsi Meet** - Free, self-hosted, Apache 2.0
- **JaaS (Jitsi as a Service)** - $0.35/MAU, managed by 8x8
- **8x8 CPaaS** - Enterprise video APIs

### Features & Capabilities

**Strengths:**
- ✅ 100% open source (Apache 2.0)
- ✅ No account required to join
- ✅ No meeting time limits
- ✅ Up to 100 participants (comfortable at 200-250)
- ✅ End-to-end encryption available
- ✅ Self-hosted option
- ✅ AV1 codec support (2025)
- ✅ SSRC rewriting for large calls (2025)
- ✅ GSoC 2025 accepted

**Weaknesses (Your Opportunities):**
- ❌ **No screen annotations** - Cannot draw on shared content
- ❌ **No virtual backgrounds** (Google Meet has this)
- ❌ **No built-in recording** (requires external setup)
- ❌ **No breakout rooms** (planned but not shipped)
- ❌ Audio/video quality issues in large meetings
- ❌ Stability problems on low bandwidth
- ❌ Limited enterprise features out-of-box
- ❌ "Very bugged" audio share function
- ❌ No room control/moderation by default
- ❌ Anyone can create room with your company name

Sources: [Capterra Reviews](https://www.capterra.com/p/162665/Jitsi/reviews/), [SaaSWorthy](https://www.saasworthy.com/product/jitsi-meet), [GetApp](https://www.getapp.com/it-communications-software/a/jitsi-meet/)

### User Sentiment Analysis

**Positive Feedback:**
> "Best open-source and free video conferencing tool. Where every tool in the market charges a lot for basic features, it comes with all advanced features at no cost."

**Negative Feedback:**
> "Jitsi's video and audio quality are not robust, with multiple sound lags experienced during meetings, making it unsuitable for long, remote working sessions."

> "Users report having no control over other people when hosting a room, nor over your own room once you leave it."

> "Jitsi does not function well with older models of phones or for people with weak internet connections."

### 8x8 Parent Company Health

| Metric | Value | Trend |
|--------|-------|-------|
| Revenue (FY2024) | $715M | -1.87% YoY |
| Q3 FY2025 Revenue | $178.9M | -1.2% YoY |
| Stock Price | ~$1.92 | 52-week: $1.52-$3.52 |
| Cash Position | $104.6M | After $33M debt repayment |
| Analyst Rating | Buy (7 analysts) | Target: $2.49 |

**Analysis:** 8x8 is a struggling public company with declining revenue. They're focused on AI-powered contact center, not Jitsi innovation. This means:
- Jitsi unlikely to get significant investment
- Open-source community drives most development
- JaaS is a side business, not priority

### Competitive Gap Analysis

| Feature | Jitsi | Zoom | Etch Opportunity |
|---------|-------|------|---------------------|
| Screen Annotation | ❌ No | ✅ Yes | ✅ Core differentiator |
| Self-Hosted | ✅ Yes | ❌ No | ✅ Match + better |
| Recording Built-in | ❌ No | ✅ Yes | Enterprise tier |
| Virtual Backgrounds | ❌ No | ✅ Yes | Nice-to-have |
| Breakout Rooms | ❌ No | ✅ Yes | Future roadmap |
| Enterprise SSO | ❌ Manual | ✅ Yes | Enterprise tier |
| Quality/Stability | ⚠️ Issues | ✅ Good | Use LiveKit |

---

## 2. Tuple - Deep Dive

### Company Overview

| Attribute | Value | Source |
|-----------|-------|--------|
| **Founded** | 2018 | [Crunchbase](https://www.crunchbase.com/organization/tuple-328f) |
| **Founders** | Ben Orenstein, Spencer Dixon, Joel Quenneville | Himalayas |
| **CEO** | Ben Orenstein | Crunchbase |
| **Funding** | **$0 (Bootstrapped)** | Crunchbase |
| **Revenue** | "Millions" (est. $3-10M ARR) | Company statements |
| **Users** | "Tens of thousands" paid users | Company statements |
| **Employees** | 1-10 | Tracxn |
| **Platforms** | macOS, Windows | tuple.app |

### Business Model

```
Freemium Trial → Paid Subscription ($25-30/user/month)
```

- **14-day free trial**
- **Engineering Teams:** $30/user/month
- **Enterprise:** Custom pricing
- **Startup discount:** 90% off for 1 year (<2 years old, <50 employees)
- **Open source discount:** Free licenses for OSS maintainers

### Why Tuple Matters for Etch

Tuple proves that **developers will pay premium prices** ($25-30/user/mo) for:
1. Low-latency, high-quality screen sharing
2. Built-in annotation/drawing tools
3. Developer-focused UX

### Features Deep Dive

**Screen Annotation (Key Feature):**
- Draw or type on shared screen
- Drawings can fade after 2 seconds OR persist
- Pulsing indicator tool (highlight attention)
- Text annotation anywhere on screen
- Works as shared virtual whiteboard
- Focus ring (single-click highlight)

Sources: [Tuple Docs](https://docs.tuple.app/article/9-guest), [Tower Blog](https://www.git-tower.com/blog/tuple-guide-to-remote-collaboration)

**Core Features:**
- 5K resolution screen sharing
- Seamless driver switching
- Dual mouse cursors
- Shared clipboard
- End-to-end encryption
- Native C++ engine (not Electron)
- Up to 6 people per call
- Emoji reactions

**Notable Customers:**
- Shopify
- Stripe
- Spotify
- Netflix
- ThoughtWorks (recommends on Tech Radar)

### Tuple Pricing Strategy

| Tier | Price | Target |
|------|-------|--------|
| Trial | Free (14 days) | All |
| Engineering Teams | $30/user/mo | SMB dev teams |
| Enterprise | Custom | Large orgs |
| Startup Discount | 90% off year 1 | Early stage |
| OSS Discount | Free | Open source maintainers |

**Key Insight:** Tuple charges **2-3x more than Zoom** and developers pay it because the experience is worth it.

### Competitive Position vs Etch

| Dimension | Tuple | Etch |
|-----------|-------|----------|
| Pricing | $30/user/mo | $12-20/user/mo |
| Open Source | ❌ No | ✅ Yes (Apache 2.0) |
| Self-Hosted | ❌ No | ✅ Yes |
| Annotation | ✅ Excellent | ✅ Core feature |
| Max Participants | 10 (was 6, took 1yr to scale) | More (LiveKit scales) |
| Resolution | 5K (native C++ engine) | 1080p browser (sufficient for MVP) |
| Desktop App | macOS/Windows | Tauri (cross-platform) |
| Web Version | ❌ No | ✅ Yes |
| Business Model | Bootstrapped SaaS | Open Core |

**Opportunity:** Etch can be the "open-source Tuple" at lower price point, with self-hosting option Tuple doesn't offer.

---

## 3. LiveKit - Deep Dive

### Company Overview

| Attribute | Value | Source |
|-----------|-------|--------|
| **Founded** | 2021 | [Tracxn](https://tracxn.com/d/companies/livekit/__EYmABvsm3Z-XhlzDGi00jrnR0h5G9Qhw5sl14nsb-f4) |
| **Founders** | Russell D Sa (CEO), David Zhao | Crunchbase |
| **Total Funding** | **$83M** | [FinSMEs](https://www.finsmes.com/2025/04/livekit-raises-45m-in-series-b-at-a-345m-valuation.html) |
| **Latest Valuation** | **$345M** (Series B, April 2025) | FinSMEs |
| **Revenue** | $3M (2023) | CBInsights |
| **GitHub Stars** | 12,000+ | [GitHub](https://github.com/livekit/livekit) |
| **GitHub Forks** | 1,000+ | GitHub |
| **License** | Apache 2.0 | GitHub |

### Funding History

| Round | Date | Amount | Valuation | Lead Investor |
|-------|------|--------|-----------|---------------|
| Series B | Apr 2025 | $45M | $345M | Altimeter Capital |
| Series A | Jun 2024 | $22M | $110M | Altimeter, Redpoint |
| Seed | 2022 | $16M | - | - |

### Why LiveKit Matters: It's Your Infrastructure

**LiveKit is NOT a competitor - it's your enabler.**

Etch architecture already uses LiveKit. Here's why that's the right choice:

1. **Battle-tested:** OpenAI uses LiveKit for voice AI
2. **Scalable:** Millions of users in single session
3. **Open source:** Same Apache 2.0 license as Etch
4. **Self-hosted option:** Aligns with your value prop
5. **Active development:** $83M funding, 87 GitHub repos

### LiveKit Capabilities

**Core Tech:**
- WebRTC SFU (Selective Forwarding Unit)
- Written in Go (Pion WebRTC)
- Sub-100ms latency to edge
- Horizontally scalable mesh network
- End-to-end encryption

**SDK Support:**
- JavaScript, React
- iOS (Swift), Android (Kotlin)
- Flutter, React Native
- Unity (gaming)
- Node.js, Go, Rust

**Advanced Features:**
- Speaker detection
- Simulcast
- SVC codecs (VP9, AV1)
- Selective subscription
- Webhooks
- Multi-region distribution
- Conversational AI integration

### LiveKit Cloud Pricing

| Plan | Monthly | Concurrent Users | Minutes Included |
|------|---------|------------------|------------------|
| **Build** | $0 | 100 | 5,000 |
| **Ship** | $50 | 1,000 | 150,000 |
| **Scale** | $500 | Unlimited | 1,500,000 |

**Overage Rates:**
- Video: $0.015/minute
- Audio: $0.004/minute
- Connection: $0.0005/minute (volume discounts)
- Recording: $0.02/minute (video), $0.005/minute (audio)

Sources: [LiveKit Pricing](https://livekit.io/pricing), [LiveKit Blog](https://blog.livekit.io/towards-a-future-aligned-pricing-model/)

### Self-Hosted Option

> "Self-hosted LiveKit is available for developers who want to run everything on their own infrastructure for maximum control."

- Same APIs and SDKs as Cloud
- No code changes to switch between Cloud/self-hosted
- Free community support (no SLA)
- Ideal for compliance/sovereignty requirements

**This is perfect for Etch:** Your customers self-host Etch, which self-hosts LiveKit. Maximum data sovereignty.

### Notable LiveKit Customers

| Customer | Use Case |
|----------|----------|
| **OpenAI** | Voice AI, real-time LLM conversations |
| **Polymath** | Robotics, low-latency video streaming |
| **Assort Health** | Healthcare AI agents |

### Implications for Etch

1. **Don't rebuild WebRTC** - LiveKit already solved this
2. **Leverage their funding** - $83M means continued development
3. **Match their license** - Both Apache 2.0, no conflicts
4. **Self-hosted story** - LiveKit self-hosting enables Etch self-hosting
5. **Scale with them** - They handle millions of users

---

## 4. Competitive Positioning Map

```
                    HIGH PRICE
                        │
           Tuple        │         Zoom Enterprise
         ($30/user)     │          ($20/user)
                        │
    Premium Dev Tools ──┼── Enterprise SaaS
                        │
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │    Etch       │                   │
    │    SWEET SPOT     │     Teams         │
    │  ($12-20/user)    │   ($4-22/user)    │
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
    Open Source/Free ───┼─── Proprietary
                        │
           Jitsi        │      Google Meet
          (Free)        │       (Free tier)
                        │
                    LOW PRICE
```

### Positioning Strategy

| Axis | Where Etch Sits |
|------|---------------------|
| **Price** | Mid-tier ($12-20) - cheaper than Tuple, similar to Zoom |
| **Open Source** | Fully open (Apache 2.0) - only Jitsi compares |
| **Self-Hosted** | Yes - unlike Zoom/Teams/Tuple |
| **Annotation Quality** | Tuple-level - far beyond Jitsi |
| **Target Market** | Developer/design teams - like Tuple |

---

## 5. Strategic Recommendations

### Against Jitsi

| Strategy | Action |
|----------|--------|
| **Feature Differentiation** | Emphasize annotations prominently |
| **Quality Superiority** | LiveKit > Jitsi's homegrown stack |
| **Easier Setup** | One-command Docker deployment |
| **Better Docs** | Developer-focused documentation |
| **Enterprise Features** | SSO, admin console, air-gapped |

**Messaging:** "Like Jitsi, but with annotations and actually works well."

### Against Tuple

| Strategy | Action |
|----------|--------|
| **Price Undercut** | $12-20 vs $30/user |
| **Open Source** | Tuple is closed source |
| **Self-Hosted** | Tuple has no self-hosted option |
| **Web Version** | Tuple requires desktop app |
| **Larger Meetings** | Tuple caps at 10 people (took 1yr to scale from 6) |

**Messaging:** "Open-source Tuple at half the price, self-hosted."

### With LiveKit

| Strategy | Action |
|----------|--------|
| **Leverage Infrastructure** | Don't compete, use them |
| **Co-marketing** | Get listed as LiveKit showcase |
| **Contribute Back** | PRs, bug reports, community |
| **Match Licensing** | Both Apache 2.0 |

**Messaging:** "Powered by LiveKit" (builds credibility).

---

## 6. Key Takeaways

### The Opportunity Is Clear

1. **Jitsi gap:** No annotations, quality issues, stagnant parent company
2. **Tuple validation:** Devs pay $30/user for good tools
3. **LiveKit enablement:** World-class infrastructure, open source

### Your Unique Position

```
Etch = Jitsi's openness + Tuple's features + LiveKit's quality
         = Open-source meeting platform with real-time annotations
         = Self-hosted data sovereignty
         = Developer-first experience
         = $12-20/user (vs $30 Tuple, $0 Jitsi)
```

### Risk Assessment

| Competitor | Risk Level | Mitigation |
|------------|------------|------------|
| Jitsi adds annotations | Low | 8x8 unlikely to invest; move fast |
| Tuple goes open source | Very Low | Different business model |
| Zoom improves self-hosted | Low | Not their strategy |
| LiveKit builds end-user product | Low | They're infrastructure, not apps |
| New VC-funded entrant | Medium | Build community moat |

---

## Sources

**Jitsi:**
- [Crunchbase - Jitsi](https://www.crunchbase.com/organization/jitsi)
- [Tracxn - Jitsi](https://tracxn.com/d/companies/jitsi/__XIHjT8WrY8VYzIVkGySasu2r-rkRC-9YQ3GlUD0PaF4)
- [Capterra Reviews](https://www.capterra.com/p/162665/Jitsi/reviews/)
- [8x8 Wikipedia](https://en.wikipedia.org/wiki/8x8)
- [8x8 Q3 FY2025 Results](https://www.businesswire.com/news/home/20250203066974/en/8x8-Inc.-Announces-Third-Quarter-Fiscal-Year-2025-Financial-Results)

**Tuple:**
- [Crunchbase - Tuple](https://www.crunchbase.com/organization/tuple-328f)
- [Tuple Official Site](https://tuple.app/)
- [Tuple Docs](https://docs.tuple.app/article/9-guest)
- [Tower Blog - Tuple Guide](https://www.git-tower.com/blog/tuple-guide-to-remote-collaboration)
- [ThoughtWorks Radar](https://www.thoughtworks.com/en-in/radar/tools/tuple)

**LiveKit:**
- [LiveKit GitHub](https://github.com/livekit/livekit)
- [LiveKit Series B Announcement](https://www.finsmes.com/2025/04/livekit-raises-45m-in-series-b-at-a-345m-valuation.html)
- [Tracxn - LiveKit Funding](https://tracxn.com/d/companies/livekit/__EYmABvsm3Z-XhlzDGi00jrnR0h5G9Qhw5sl14nsb-f4/funding-and-investors)
- [LiveKit Pricing](https://livekit.io/pricing)
- [Neuphonic - LiveKit Review](https://www.neuphonic.com/blog/livekit-review-open-source-webrtc-ai-voice-tool)

---

**Document Information**

**Workflow:** BMad Competitive Intelligence Research  
**Generated:** 2025-12-01  
**Web Searches Conducted:** 8    
**Sources Cited:** 15+

---

_This competitive intelligence report was generated using the BMad Method Research Workflow with real-time 2025 market intelligence gathering._
