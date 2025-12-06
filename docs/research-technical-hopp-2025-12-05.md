# Technical Research Report: Hopp Screen Capture Architecture

**Date:** 2025-12-05
**Prepared by:** BMad
**Project Context:** NAMELESS - Understanding competitor screen capture implementation for optimization

---

## Executive Summary

Hopp achieves sub-100ms latency screen sharing by using a **forked LiveKit Rust SDK** that exposes libwebrtc's native `DesktopCapturer` module. This bypasses the traditional approach of capturing frames in user code and manually converting them to YUV - instead, the capture happens directly within libwebrtc's optimized pipeline with hardware acceleration (ScreenCaptureKit on macOS).

### Key Recommendation

**Primary Choice:** Fork LiveKit Rust SDK to expose DesktopCapturer (Hopp's approach)

**Rationale:** This eliminates the IPC overhead between capture and encoding, leverages hardware-accelerated native APIs, and integrates directly with WebRTC's optimized video pipeline. The alternative (scap + manual frame handling) would still require converting frames and passing them through LiveKit's `capture_frame()` API.

**Key Benefits:**

- Sub-100ms latency at 1080p (86ms median on good network)
- Hardware-accelerated capture via ScreenCaptureKit/DirectX
- Direct integration with WebRTC encoding pipeline
- Cross-platform (macOS, Windows) with single codebase

---

## 1. Research Objectives

### Technical Question

How does Hopp implement high-performance screen capture in their Rust-based remote desktop/collaboration tool, and what architectural decisions enable them to achieve sub-100ms latency at 1080p+ resolution?

### Project Context

**NAMELESS Current State:**
- Tauri + Rust sidecar architecture
- Using xcap library for screen capture
- Achieving only ~5 FPS at 2560x1440 (target: 60fps)
- JSON/IPC communication between sidecar and main process
- Separate encoding step (RGBA → I420) before LiveKit

**Goal:**
- Understand Hopp's architecture to inform optimization strategy
- Determine if we should adopt similar approach or use alternative (scap, etc.)

### Requirements and Constraints

#### Functional Requirements

- Capture screen at up to 5K resolution (5120x2880)
- Achieve 60fps capture rate
- Support both screen and window capture
- Work on macOS and Linux (Windows future)
- Integrate with LiveKit for WebRTC streaming

#### Non-Functional Requirements

- Sub-100ms end-to-end latency (capture → display on viewer)
- Low CPU usage (<50% on capture device)
- Minimal memory footprint
- No dropped frames under normal network conditions

#### Technical Constraints

- Tauri + Rust stack (existing architecture)
- LiveKit as WebRTC infrastructure (already integrated)
- macOS 12.3+ (for ScreenCaptureKit)
- Linux: X11 and Wayland support needed

---

## 2. Hopp's Architecture Deep Dive

### Overview

Hopp is an open-source remote pair programming application built with:
- **Frontend:** Tauri (Rust + Web UI)
- **Core Engine:** Rust sidecar binary
- **WebRTC:** LiveKit with forked Rust SDK
- **Capture:** libwebrtc's native DesktopCapturer

**Source:** [Hopp GitHub](https://github.com/gethopp/hopp) | [Hopp Website](https://www.gethopp.app/)

### Key Architectural Decisions

#### 1. Sidecar Process for Capture

Hopp uses Tauri's sidecar concept to run a separate binary that handles:
- Screen capture and streaming
- Remote control input (mouse/keyboard)
- Controller cursor drawing

**Rationale:** Allows independent development and testing of capture component. The sidecar handles the performance-critical video pipeline separately from the UI process.

**Source:** [Tauri vs Electron Blog Post](https://www.gethopp.app/blog/tauri-vs-electron)

#### 2. Forked LiveKit Rust SDK

The critical innovation is their **forked LiveKit Rust SDK** that exposes libwebrtc's `DesktopCapturer` module.

**Standard LiveKit approach:**
```
User Code → Capture (xcap/scap) → RGBA → Convert to YUV → capture_frame() → LiveKit → WebRTC
```

**Hopp's approach:**
```
libwebrtc DesktopCapturer → Native capture → Direct to WebRTC encoder
```

**Source:** [gethopp/rust-sdks](https://github.com/gethopp/rust-sdks) | [Encoder Comparison Blog](https://www.gethopp.app/blog/screensharing-encoders-compared)

#### 3. Build Process

Building their screen_sharer requires:
1. Build custom libwebrtc from their fork (contains patches)
2. Set `LK_CUSTOM_WEBRTC` environment variable
3. Build screen_sharer with cargo

```bash
export LK_CUSTOM_WEBRTC="/path/to/your/custom/libwebrtc"
cd screen_sharer
cargo build --release
```

**Source:** [livekit_encoders_compared](https://github.com/gethopp/livekit_encoders_compared)

---

## 3. Performance Benchmarks (Hopp's Published Data)

### Latency Results

| Scenario | Median | Mean | Processing Delay |
|----------|--------|------|------------------|
| 1080p @ 4Mbps uplink | 158ms | 159ms | 110ms |
| 1080p @ 33Mbps uplink | **86ms** | 98ms | 51ms |
| 1440p @ 33Mbps uplink | 120ms | 126ms | 82ms |

**Key Insight:** Encoding/decoding and jitter buffer delays dominated latency, not network transfer.

**Source:** [Latency Exploration Blog](https://www.gethopp.app/blog/latency-exploration)

### Encoder Performance (macOS M1, 1080p)

| Codec | CPU Usage (simulcast on) | CPU Usage (simulcast off) |
|-------|--------------------------|---------------------------|
| VP8 | 52.7% | 50.3% |
| H264 | 43.1% | 39.5% |
| AV1 | 60.9% | 60.9% |
| VP9 | ~55% | ~50% |

**Recommendation:** VP8 on macOS, H264 on Windows for lowest latency.

**Source:** [Encoder Comparison Blog](https://www.gethopp.app/blog/screensharing-encoders-compared)

### Bandwidth Requirements (with Simulcast)

| Resolution | VP8 | VP9 | H264 |
|------------|-----|-----|------|
| 1080p | 0.70 Mbps | 0.30 Mbps | 0.85 Mbps |
| 1440p | 0.90 Mbps | 0.38 Mbps | 1.10 Mbps |

**Source:** [Encoder Comparison Blog](https://www.gethopp.app/blog/screensharing-encoders-compared)

---

## 4. Hopp's Latency Optimization Techniques

### Change #1: Quantization & Rate Control
- Reduced max quantizer: 52 → 36
- Increased min quantizer: 2 → 4
- Undershoot: 100% (aggressive bitrate reduction on static content)
- Overshoot: 15%
- **Result:** ~50ms improvement

### Change #2: Buffer Configuration (VP9)
```
rc_buf_sz: 300ms
rc_buf_initial_sz: 0ms
rc_buf_optimal_sz: 200ms
```
- **Result:** 100ms+ improvement under poor network

### Change #3: Screencast Mode & ARNR
- Enabled `is_screencast` flag
- VP8E_SET_ENABLEAUTOALTREF: 6
- VP8E_SET_ARNR_MAXFRAMES: 5 (caps encoder delay to 150ms)
- VP8E_SET_ARNR_STRENGTH: 5
- **Result:** First sub-100ms at 1080p

**Source:** [Latency Exploration Blog](https://www.gethopp.app/blog/latency-exploration)

---

## 5. Comparison: Hopp vs NAMELESS Current Architecture

| Aspect | Hopp | NAMELESS (Current) |
|--------|------|-------------------|
| **Capture Library** | libwebrtc DesktopCapturer | xcap |
| **Capture Method** | Hardware-accelerated (ScreenCaptureKit) | Screenshot-based |
| **Frame Path** | Direct to WebRTC encoder | Sidecar → JSON IPC → Tauri → LiveKit |
| **Color Conversion** | In WebRTC pipeline | Manual RGBA → I420 |
| **Achieved FPS** | 30fps (capped for testing) | ~5fps |
| **Latency** | 86ms (1080p, good network) | Not measured (but high) |
| **Architecture** | In-process sidecar with forked SDK | Separate sidecar with IPC |

### Why NAMELESS is Slow

1. **xcap uses screenshot API** - Not hardware-accelerated, takes ~58ms per frame
2. **Manual color conversion** - Additional 10ms for RGBA → I420
3. **JSON IPC overhead** - Serializing/deserializing frames
4. **Not integrated with WebRTC** - Frames go through multiple copies

---

## 6. Options for NAMELESS

### Option A: Fork LiveKit Rust SDK (Hopp's Approach)

**Pros:**
- Proven to achieve sub-100ms latency
- Hardware-accelerated capture
- Direct WebRTC integration
- No IPC overhead

**Cons:**
- Significant effort to maintain fork
- Need to build custom libwebrtc
- Complex build process
- Tight coupling to LiveKit internals

**Effort:** High (weeks to months)

### Option B: Use scap Library + Optimized IPC

**Pros:**
- scap uses ScreenCaptureKit (hardware-accelerated)
- Simpler than forking LiveKit
- Keeps sidecar architecture

**Cons:**
- Still have IPC overhead
- Still need manual frame conversion
- May not achieve sub-100ms

**Effort:** Medium (days to weeks)

### Option C: Hybrid - scap + Shared Memory IPC

**Pros:**
- Hardware-accelerated capture (scap)
- Minimal IPC overhead (shared memory)
- Keeps modular architecture

**Cons:**
- Complex shared memory implementation
- Platform-specific IPC code
- Still not as fast as direct integration

**Effort:** Medium-High (weeks)

### Option D: WebRTC Native Capture in Browser

**Pros:**
- Uses browser's getDisplayMedia
- No native code needed
- Works out of the box

**Cons:**
- WebKit doesn't support getDisplayMedia (why we have sidecar!)
- Not applicable for macOS/Linux Tauri

**Effort:** N/A (not viable)

---

## 7. Recommendation for NAMELESS

### Short-Term (V1): Switch to scap

Replace xcap with scap library to get hardware-accelerated capture immediately:
- Expected improvement: 5fps → 30-60fps
- Keeps current architecture
- Lower risk, faster implementation

### Medium-Term (V2): Evaluate Fork Strategy

After V1 ships, evaluate whether to:
1. Fork LiveKit Rust SDK (if latency requirements demand it)
2. Contribute DesktopCapturer exposure upstream to LiveKit
3. Use optimized IPC (shared memory) if scap + current IPC is sufficient

### Long-Term: Contribute Upstream

Work with LiveKit team to expose DesktopCapturer in official SDK, benefiting entire ecosystem.

---

## 8. References and Sources

### Official Sources
- [Hopp GitHub Repository](https://github.com/gethopp/hopp)
- [Hopp Website](https://www.gethopp.app/)
- [gethopp/rust-sdks (forked LiveKit SDK)](https://github.com/gethopp/rust-sdks)
- [gethopp/livekit_encoders_compared](https://github.com/gethopp/livekit_encoders_compared)

### Technical Blog Posts
- [Screen Sharing with WebRTC and LiveKit: Finding the Best Encoder](https://www.gethopp.app/blog/screensharing-encoders-compared)
- [Achieving <100ms Latency for Remote Control with WebRTC](https://www.gethopp.app/blog/latency-exploration)
- [Tauri vs. Electron: Performance, Bundle Size, and the Real Trade-offs](https://www.gethopp.app/blog/tauri-vs-electron)

### Related Resources
- [LiveKit Rust SDK](https://github.com/livekit/rust-sdks)
- [Apple ScreenCaptureKit Documentation](https://developer.apple.com/documentation/screencapturekit/)
- [scap Crate](https://crates.io/crates/scap)

---

## 9. Architecture Decision Record (ADR)

### ADR-001: Screen Capture Architecture for NAMELESS

**Status:** Proposed

**Context:**
NAMELESS currently uses xcap for screen capture, achieving only ~5fps at 2560x1440. Competitor Hopp achieves sub-100ms latency using a forked LiveKit SDK with direct DesktopCapturer integration.

**Decision Drivers:**
- Performance: Need 60fps at up to 5K
- Latency: Target sub-100ms end-to-end
- Maintainability: Prefer standard libraries over forks
- Time to market: V1 needs to ship soon

**Considered Options:**
1. Fork LiveKit Rust SDK (Hopp's approach)
2. Switch to scap library
3. scap + shared memory IPC
4. Keep xcap with optimizations

**Decision:**
For V1: Switch to scap library while keeping current architecture.
For V2: Evaluate LiveKit fork based on V1 performance data.

**Consequences:**

**Positive:**
- Immediate performance improvement (estimated 10-20x)
- Lower implementation risk
- Maintains modular architecture

**Negative:**
- May not achieve Hopp-level latency (<100ms)
- Still have IPC overhead
- May need to revisit for V2

**Implementation Notes:**
1. Replace xcap with scap in capture-sidecar
2. Update frame capture loop for scap API
3. Benchmark new performance
4. Evaluate if further optimization needed

---

_This technical research report was generated using the BMad Method Research Workflow, combining systematic technology evaluation with real-time 2025 web research._
