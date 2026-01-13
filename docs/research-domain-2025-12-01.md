# Domain Research Report: Etch

**Date:** 2025-12-01
**Prepared by:** BMad (Analyst)
**Research Type:** Technical Architecture - Tauri, WebRTC, Screen Capture
**Key Question:** Can Tauri deliver <2s startup AND 5K resolution?

---

## Executive Summary

| Goal | Tauri Capability | Verdict |
|------|------------------|---------|
| **<2s startup** | ✅ ~500ms typical | **EXCEEDS** |
| **5K resolution** | ⚠️ Complex, requires sidecar | **POSSIBLE BUT HARD** |
| **Cross-platform** | ✅ macOS, Windows, Linux | **YES** |
| **LiveKit integration** | ✅ Via browser WebRTC | **YES (with caveats)** |

**Bottom Line:** Tauri is excellent for startup speed and bundle size. For 5K streaming, you'll likely need a **native sidecar** (Rust binary) handling screen capture, similar to how Hopp and Tuple do it.

---

## 1. Tauri Performance Analysis

### Startup Time Benchmarks (2024)

| Framework | Startup Time | Bundle Size | RAM Usage |
|-----------|--------------|-------------|-----------|
| **Tauri** | **< 500ms** | 2.5-10 MB | 30-40 MB |
| **Electron** | 1-2 seconds | 85-150 MB | 100+ MB |

Sources: [Hopp Blog](https://www.gethopp.app/blog/tauri-vs-electron), [Levminer](https://www.levminer.com/blog/tauri-vs-electron), [Codeology](https://codeology.co.nz/articles/tauri-vs-electron-2025-desktop-development.html)

> "Startup time is an area where the difference is obvious. Electron typically takes one to two seconds to load. Tauri consistently launched in under half a second." - [Hopp](https://www.gethopp.app/blog/tauri-vs-electron)

**Verdict:** ✅ Tauri **crushes** the <2s startup goal. You'll likely hit ~500ms.

---

### Why Tauri Is Fast

1. **No bundled Chromium** - Uses OS native WebView
2. **Rust backend** - Compiled, not interpreted
3. **Small binary** - Less to load from disk
4. **Native webview** - Already loaded by OS

---

## 2. The Screen Capture Problem

### Tauri's WebRTC Limitations

**Critical Issue:** Tauri uses native WebViews, which have inconsistent WebRTC support.

| Platform | WebView | getDisplayMedia | Screen Capture |
|----------|---------|-----------------|----------------|
| **macOS** | WKWebView | ❌ Not supported | Need native API |
| **Windows** | WebView2 (Edge) | ✅ Works | Browser-level |
| **Linux** | WebKitGTK | ⚠️ Requires custom build | Complex |

Sources: [Tauri GitHub #85](https://github.com/tauri-apps/wry/issues/85), [Tauri Discussion #8426](https://github.com/tauri-apps/tauri/discussions/8426)

> "On macOS, Tauri uses WKWebView which does not support `getDisplayMedia`. As such, there is no other way to capture the screen through the web interface." - [GitHub Issue](https://github.com/tauri-apps/wry/issues/85)

**Implication:** You **cannot** rely on browser `getDisplayMedia()` on macOS with Tauri.

---

### The Sidecar Solution

**How Hopp solved it:**

> "Hopp relies on a customized version of WebRTC to achieve ultra-low latency screen sharing. The app needs to stream video directly from a backend process, not using the browser's standard screen-sharing APIs. Rust's performance suits this intensive task exceptionally well." - [Hopp](https://www.gethopp.app/blog/tauri-vs-electron)

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│                   Tauri App                     │
│  ┌──────────────┐        ┌──────────────────┐  │
│  │   WebView    │◄──────►│   Rust Backend   │  │
│  │  (UI/React)  │  IPC   │   (Tauri Core)   │  │
│  └──────────────┘        └────────┬─────────┘  │
│                                   │            │
│                          ┌────────▼─────────┐  │
│                          │  Native Sidecar  │  │
│                          │  (Screen Capture │  │
│                          │   + Encoding)    │  │
│                          └────────┬─────────┘  │
└───────────────────────────────────┼────────────┘
                                    │
                           ┌────────▼─────────┐
                           │     LiveKit      │
                           │    (WebRTC)      │
                           └──────────────────┘
```

**Key Insight:** Tauri's built-in "Sidecar" concept lets you manage a separate native binary for screen capture.

---

## 3. How Tuple Achieves 5K

### Tuple's Architecture

| Component | Technology | Why |
|-----------|------------|-----|
| **Core Engine** | Native C++ | Performance, low CPU |
| **Screen Capture** | Native APIs | Full resolution access |
| **Video Encoding** | Custom WebRTC | Optimized for screen content |
| **UI** | Native (AppKit/Win32) | Not Electron, not Tauri |

Sources: [tuple.app](https://tuple.app/), [Tower Blog](https://www.git-tower.com/blog/tuple-guide-to-remote-collaboration)

> "The core of Tuple is a natively compiled, cross-platform C++ engine. It's not just another Electron app." - [tuple.app](https://tuple.app/)

**Libraries Tuple Uses:**
- `libmediasoupclient` - WebRTC
- `Perfetto` - Performance tracing
- `websocketpp` - WebSocket communication

**Key Insight:** Tuple invested **years** building a custom native engine. They don't use any web framework for the core.

---

## 4. LiveKit's Role

### What LiveKit Handles

| Capability | LiveKit Support |
|------------|----------------|
| WebRTC SFU | ✅ Core feature |
| Audio/Video routing | ✅ Excellent |
| Screen share (browser) | ✅ Up to 1080p default |
| Screen share (native) | ⚠️ You provide the source |
| 4K streaming | ✅ With custom VideoResolution |
| 5K streaming | ⚠️ Theoretically, needs high bitrate |

### LiveKit Resolution Options

```javascript
// Default: 1080p
captureResolution: { width: 1920, height: 1080 }

// Custom 4K
captureResolution: { width: 3840, height: 2160 }

// Custom 5K (if source supports it)
captureResolution: { width: 5120, height: 2880 }
```

**Codec Recommendations:**
- **VP9** - Best quality at similar bandwidth
- **AV1** - Best compression but higher CPU
- **H264** - Limited to 720p on macOS

Sources: [LiveKit Docs](https://docs.livekit.io/home/client/tracks/screenshare/), [LiveKit KB](https://kb.livekit.io/articles/3859313029-configuring-the-client-sdk-for-optimal-video-quality)

---

## 5. Architecture Options for Etch

### Option A: Pure Browser WebRTC (Current Plan)

```
Tauri WebView → Browser getDisplayMedia → LiveKit
```

| Pros | Cons |
|------|------|
| Simple | macOS: No screen capture in WKWebView |
| Works on Windows | Limited to browser capabilities |
| Quick to ship | Max ~1080p practical |

**Verdict:** ❌ Won't work on macOS without workaround

---

### Option B: Tauri + Rust Sidecar (Recommended)

```
Tauri WebView (UI) → Rust Sidecar (Screen Capture) → LiveKit
```

| Pros | Cons |
|------|------|
| Full resolution access | More complex architecture |
| Works on all platforms | Longer development time |
| Native performance | Need Rust screen capture expertise |
| Premium feel | Two processes to manage |

**Recommended Libraries:**
- `xcap` - Cross-platform screen capture (used by tauri-plugin-screenshots)
- `scrap` - From RustDesk, proven at scale
- `nokhwa` - Camera capture

**Verdict:** ✅ Best path to premium quality

---

### Option C: Electron (Fallback)

```
Electron → Chromium getDisplayMedia → LiveKit
```

| Pros | Cons |
|------|------|
| Screen capture just works | Slow startup (1-2s) |
| Mature ecosystem | Heavy (85MB+) |
| Consistent cross-platform | Not "premium feel" |

**Verdict:** ⚠️ Works but doesn't match your goals

---

### Option D: Native C++ (Tuple's Approach)

```
Custom C++ Engine → Native APIs → Custom WebRTC
```

| Pros | Cons |
|------|------|
| Ultimate performance | Years of development |
| Full control | Need C++ expertise |
| True 5K support | High maintenance burden |

**Verdict:** ❌ Too expensive for MVP

---

## 6. Recommended Architecture

### MVP Architecture (Ship Fast)

```
┌─────────────────────────────────────────────────────┐
│                   Etch Desktop                   │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │              Tauri WebView (UI)                │ │
│  │         React + Tailwind + LiveKit SDK         │ │
│  └───────────────────────┬────────────────────────┘ │
│                          │ IPC                       │
│  ┌───────────────────────▼────────────────────────┐ │
│  │             Rust Backend (Tauri)               │ │
│  │  - Window management                           │ │
│  │  - System tray                                 │ │
│  │  - Deep links                                  │ │
│  └───────────────────────┬────────────────────────┘ │
│                          │                          │
│  ┌───────────────────────▼────────────────────────┐ │
│  │          Screen Capture Sidecar (Rust)         │ │
│  │  - xcap/scrap for native capture               │ │
│  │  - VP9 encoding                                │ │
│  │  - Streams to LiveKit                          │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   LiveKit Server      │
              │   (Self-hosted or     │
              │    LiveKit Cloud)     │
              └───────────────────────┘
```

### Resolution Strategy

| Phase | Resolution | Implementation |
|-------|------------|----------------|
| **MVP** | 1080p | Browser getDisplayMedia (Windows) + Sidecar (macOS) |
| **v1.1** | 1440p | Sidecar on all platforms |
| **v2.0** | 4K | Optimized sidecar + VP9/AV1 |
| **Future** | 5K | If demand exists |

---

## 7. Technical Risks & Mitigations

### Risk 1: macOS Screen Capture

**Problem:** WKWebView doesn't support `getDisplayMedia`

**Mitigation:**
- Use `xcap` or `scrap` Rust crates
- Request screen recording permission via Tauri
- Stream to LiveKit via custom track

**Effort:** Medium (1-2 weeks)

---

### Risk 2: Cross-Platform Consistency

**Problem:** Different WebViews have different bugs

**Mitigation:**
- Test on all platforms early
- Use sidecar for platform-specific code
- Feature flags for platform differences

**Effort:** Ongoing

---

### Risk 3: Sidecar Complexity

**Problem:** Managing two processes

**Mitigation:**
- Tauri has built-in sidecar management
- Well-defined IPC protocol
- Graceful fallback to browser if sidecar fails

**Effort:** Medium

---

## 8. Alternative: RustDesk Approach

RustDesk is a proven Rust-based remote desktop that handles high-quality screen sharing.

**What They Use:**
- Custom Rust screen capture
- VP8, VP9, AV1, H264/H265 codecs
- Hardware acceleration when available
- Adaptive bitrate

**Reusable Components:**
- `scrap` crate (screen capture)
- Video codec implementations
- Network hole-punching

Sources: [RustDesk GitHub](https://github.com/rustdesk/rustdesk), [RustDesk Docs](https://rustdesk.com/docs/en/self-host/client-configuration/advanced-settings/)

**Consideration:** You could fork/learn from RustDesk's approach for the sidecar.

---

## 9. Answering Your Question

### Can Tauri deliver <2s startup AND 5K resolution?

| Goal | Answer | How |
|------|--------|-----|
| **<2s startup** | ✅ **Yes, easily** | Native webview, ~500ms typical |
| **5K resolution** | ⚠️ **Yes, but needs work** | Requires native sidecar, not browser APIs |

### Is Tauri the Right Choice?

**Yes, but with a sidecar.**

| If You Want | Framework |
|-------------|-----------|
| Fast startup + Premium feel + 5K | **Tauri + Rust Sidecar** ✅ |
| Quick MVP, Windows only | Tauri (browser WebRTC) |
| Just works everywhere, slower | Electron |
| Ultimate performance (like Tuple) | Native C++ (expensive) |

### Recommended Path

1. **MVP:** Tauri + browser WebRTC for Windows, placeholder for macOS
2. **v1.0:** Add Rust sidecar for macOS screen capture
3. **v1.1:** Unify to sidecar on all platforms for consistency
4. **v2.0:** Optimize for 4K with VP9/AV1

---

## 10. Key Takeaways

1. **Tauri is the right choice** for startup speed and bundle size
2. **Browser WebRTC won't work on macOS** - need native screen capture
3. **Sidecar pattern is proven** - Hopp uses exactly this approach
4. **5K is achievable** but requires native capture + high bitrate
5. **LiveKit handles the hard networking** - you just provide the video source
6. **Start with 1080p** - it's "good enough" if bitrate is high
7. **Premium feel comes from:** instant startup + crisp text + no friction

---

## Sources

**Tauri Performance:**
- [Hopp - Tauri vs Electron](https://www.gethopp.app/blog/tauri-vs-electron)
- [Levminer - Real World Comparison](https://www.levminer.com/blog/tauri-vs-electron)
- [Codeology - 2025 Comparison](https://codeology.co.nz/articles/tauri-vs-electron-2025-desktop-development.html)

**Tauri WebRTC Issues:**
- [GitHub - WKWebView Screen Capture](https://github.com/tauri-apps/wry/issues/85)
- [GitHub - WebRTC on Linux](https://github.com/tauri-apps/tauri/discussions/8426)

**LiveKit:**
- [LiveKit Screen Share Docs](https://docs.livekit.io/home/client/tracks/screenshare/)
- [LiveKit Quality Config](https://kb.livekit.io/articles/3859313029-configuring-the-client-sdk-for-optimal-video-quality)
- [Hopp - Screen Share Encoders](https://www.gethopp.app/blog/screensharing-encoders-compared)

**Tuple:**
- [Tuple Official](https://tuple.app/)
- [Tower Blog - Tuple Guide](https://www.git-tower.com/blog/tuple-guide-to-remote-collaboration)

**RustDesk:**
- [RustDesk GitHub](https://github.com/rustdesk/rustdesk)
- [RustDesk Docs](https://rustdesk.com/docs/en/self-host/client-configuration/advanced-settings/)

---

**Document Information**

**Workflow:** BMad Domain Research
**Generated:** 2025-12-01
**Web Searches Conducted:** 8
**Sources Cited:** 15+

---

_This domain research report was generated using the BMad Method Research Workflow with real-time 2025 technical documentation and community insights._
