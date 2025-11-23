# NAMELESS

Open-Source Meeting Platform with Zoom-Style Screen Annotations

## Overview

NAMELESS is a self-hosted, open-source meeting platform with real-time screen annotations. Built on LiveKit SFU, Electron + React, and a modular architecture that separates media transport from annotation logic.

**Key Features:**
- ✅ Self-hostable deployment
- ✅ Real-time video/audio/screen-share
- ✅ Low-latency annotations (<200ms) over shared screens
- ✅ Desktop-first experience (macOS, Windows)
- ✅ Role-based permissions (host, sharer, annotator, viewer)
- ✅ Apache 2.0 license (commercial-friendly)

## Tech Stack

- **Desktop Client**: Electron + React + TypeScript
- **Media Backend**: LiveKit SFU + DataTracks
- **App Server**: Node.js or Go
- **Annotation Transport**: LiveKit DataTracks (WebRTC DataChannel)

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Annotation Protocol

See [annotation-protocol.md](./annotation-protocol.md) for the annotation message format and protocol specification.

## AI Configuration

This project includes AI rules and configurations to guide AI-assisted development:

- **`.cursorrules`**: Cursor IDE specific rules and guidelines
- **`ai.config.json`**: Structured AI configuration file
- **`.ai-rules.md`**: Detailed AI development rules and principles

### Configuration Files

#### `.cursorrules`
Contains Cursor IDE specific rules for AI assistance during development, including:
- Tech stack specifications
- Architecture principles
- Performance requirements (<200ms latency)
- Role-based permissions
- v1 non-goals

#### `ai.config.json`
JSON configuration file defining:
- Project metadata and license
- Tech stack details
- AI code generation preferences
- Feature flags and capabilities
- Performance constraints
- Development phases

#### `.ai-rules.md`
Comprehensive guide for AI-assisted development covering:
- General development principles
- Meeting platform specific rules
- Annotation system architecture
- Code generation guidelines
- Testing, documentation, and security rules

## Development Roadmap

### Phase 1 — MVP (4 Weeks)
- [ ] Self-hosted LiveKit instance
- [ ] Electron desktop app
- [ ] Screen sharing and video
- [ ] Annotation canvas overlay
- [ ] Basic roles and permissions
- [ ] DataTrack sync (stroke_add, stroke_end, stroke_delete, clear_all, sync_state)

### Phase 2 — Stability & UX (4–6 Weeks)
- [ ] Undo/redo
- [ ] Cursor indicators
- [ ] Persistent session state
- [ ] Role-based UI enhancements

### Phase 3 — Hybrid & Native Evolution (Q1 2026)
- [ ] Native overlay helper (Rust/Swift)
- [ ] Recording and replay of annotated sessions
- [ ] SDK for developers to embed annotation layer

## v1 Non-Goals

- ❌ PSTN/phone dial-in
- ❌ Browser annotation tools (view-only web is fine)
- ❌ OS-level ink overlays (future feature)
- ❌ Complex shapes/whiteboards (keep simple: draw, highlight, basic shapes)
- ❌ Recording & replay (future feature)

## Contributing

When contributing to this project, please follow the guidelines defined in `.ai-rules.md` and ensure your code adheres to the standards in `.cursorrules`.

## License

Apache 2.0 (inherited from LiveKit). Commercial usage is fully permitted.

## Author

Adam Momen - [adammomen.com](https://adammomen.com)

Contact: info@adammomen.com

