---
paths: packages/client/src-tauri/**/*
---

# Tauri v2 Documentation

This is a Tauri v2 project. When working on Tauri-related code (Rust backend, IPC, plugins, windowing, etc.), automatically fetch relevant documentation using Context7 MCP.

## Context7 Library IDs

- `/websites/v2_tauri_app` - Tauri v2 official docs (score: 83.7)
- `/tauri-apps/tauri-docs` - Tauri docs repo (score: 86.6)
- `/tauri-apps/plugins-workspace` - Official Tauri plugins
- `/websites/rs_tauri_2_9_5` - Latest Tauri 2.9.5 docs (16,899 snippets)

## When to fetch docs

Automatically use Context7 `get-library-docs` with `/websites/v2_tauri_app` when:

- Implementing Tauri commands or IPC
- Working with Tauri plugins (shell, fs, dialog, etc.)
- Screen capture, window management, or system tray
- Mobile development (iOS/Android)
- Building or bundling the app
- Any Rust code in `src-tauri/`
