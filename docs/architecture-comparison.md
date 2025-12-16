# Architecture Comparison: Hopp vs Nameless

## Overview

Both systems use a similar high-level architecture but differ significantly in how they handle async operations and internal communication.

## Thread Architecture

### Hopp
```
┌─────────────────────────────────────────────────────────────┐
│ Main Thread (winit event loop)                              │
│  - Application state                                        │
│  - Event handling                                           │
│  - UI operations                                            │
└─────────────────────────────────────────────────────────────┘
         │
         ├──► Socket Thread (blocking I/O)
         │     - Receives messages from Tauri
         │     - Sends UserEvents to main thread via EventLoopProxy
         │
         ├──► Capture Thread (blocking I/O)
         │     - Polls screen capture stream
         │     - Sends frames to RoomService
         │
         └──► RoomService Runtime (tokio multi-threaded)
               └──► Background Command Handler Task
                     - Receives commands via channel
                     - Executes async operations (.await)
                     - Sends results back via channel
                     - Spawns event handlers
```

### Nameless (Current)
```
┌─────────────────────────────────────────────────────────────┐
│ Main Thread (winit event loop)                              │
│  - Application state                                        │
│  - Event handling                                           │
│  - UI operations                                            │
└─────────────────────────────────────────────────────────────┘
         │
         ├──► Socket Runtime (tokio)
         │     - Async socket server
         │     - Receives messages from Tauri
         │     - Sends UserEvents to main thread via EventLoopProxy
         │
         ├──► Capture Thread (blocking I/O)
         │     - Polls screen capture stream
         │     - Sends frames to RoomService
         │
         └──► RoomService Runtime (tokio multi-threaded)
               └──► Uses block_on() from external thread ❌
                     - Problem: Doesn't drive async tasks properly
```

## Key Differences

### 1. RoomService Communication Pattern

#### Hopp: Command Channel Pattern
```rust
// RoomService creation
let (service_command_tx, service_command_rx) = mpsc::unbounded_channel();
let (service_command_res_tx, service_command_res_rx) = std::sync::mpsc::channel();

// Spawn background task that runs IN the runtime
async_runtime.spawn(room_service_commands(
    service_command_rx,  // Receives commands
    service_command_res_tx,  // Sends results
    ...
));

// Public API - blocking, sends command and waits for result
pub fn create_room(&self, token: String, ...) -> Result<(), Error> {
    self.service_command_tx.send(RoomServiceCommand::CreateRoom { token, ... })?;
    match self.service_command_res_rx.recv() {  // Blocks waiting for result
        Ok(RoomServiceCommandResult::Success) => Ok(()),
        ...
    }
}

// Background task - runs in runtime, can use .await
async fn room_service_commands(...) {
    while let Some(command) = service_rx.recv().await {
        match command {
            RoomServiceCommand::CreateRoom { token, ... } => {
                // This runs IN the runtime, so .await works!
                let (room, rx) = Room::connect(&url, &token, ...).await?;
                tx.send(RoomServiceCommandResult::Success).unwrap();
            }
        }
    }
}
```

**Benefits:**
- ✅ Async operations run in the runtime context
- ✅ Runtime stays active (background task always running)
- ✅ No `block_on()` needed
- ✅ Clean separation: blocking API, async implementation

#### Nameless: block_on() Pattern (Current - Problematic)
```rust
// RoomService creation
let runtime = tokio::runtime::Builder::new_multi_thread().build()?;

// Public API - uses block_on() from external thread
pub fn connect(&self, token: String) -> Result<(), String> {
    let result = self.runtime.block_on(async move {
        // Problem: block_on() from external thread doesn't drive tasks properly
        let (room, rx) = Room::connect(&url, &token, ...).await?;
        Ok(rx)
    });
    ...
}
```

**Problems:**
- ❌ `block_on()` on multi-threaded runtime from external thread doesn't work
- ❌ Runtime worker threads may not be actively polling
- ❌ Async tasks don't make progress
- ❌ Connection timeouts because `Room::connect()` never completes

### 2. Socket Communication

#### Hopp: Blocking Socket
```rust
// Synchronous, blocking socket
pub struct CursorSocket {
    stream: UnixStream,  // Blocking I/O
}

// Used in blocking thread
let mut socket = CursorSocket::new(&socket_path)?;
let message = socket.read_message()?;  // Blocks
```

#### Nameless: Async Socket
```rust
// Async socket server
pub struct CoreSocket {
    sender: mpsc::UnboundedSender<OutgoingMessage>,
}

// Runs in tokio runtime
tokio::spawn(async move {
    let listener = UnixListener::bind(socket_path)?;
    loop {
        let (stream, _) = listener.accept().await?;
        // Handle connection async
    }
});
```

**Comparison:**
- Hopp: Simpler, blocking I/O in dedicated thread
- Nameless: More modern, async I/O, but requires runtime

### 3. Event Flow

#### Hopp
```
Tauri Client
    │ (blocking socket)
    ▼
Socket Thread
    │ (EventLoopProxy.send_event)
    ▼
Main Thread (winit event loop)
    │ (handle_user_event)
    ▼
Application
    │ (room_service.create_room() - blocking, sends command)
    ▼
RoomService Command Channel
    │ (background task receives)
    ▼
Background Task (in runtime)
    │ (Room::connect().await - works!)
    │ (EventLoopProxy.send_event)
    ▼
Main Thread (winit event loop)
```

#### Nameless
```
Tauri Client
    │ (async socket)
    ▼
Socket Runtime (tokio)
    │ (EventLoopProxy.send_event)
    ▼
Main Thread (winit event loop)
    │ (handle_user_event)
    ▼
Application
    │ (spawns thread, calls room_service.connect() - block_on)
    ▼
External Thread
    │ (runtime.block_on() - doesn't work!)
    ▼
RoomService Runtime
    │ (Room::connect() never completes)
    ❌ TIMEOUT
```

## The Core Problem

**Nameless's issue:** Using `block_on()` on a multi-threaded runtime from an external thread.

When you call `block_on()` on a multi-threaded runtime from a thread that's not part of that runtime:
1. The runtime's worker threads may not be actively polling
2. The future passed to `block_on()` doesn't make progress
3. `Room::connect()` waits forever for the connection to complete
4. Timeout occurs even though the connection might be establishing

**Hopp's solution:** Never use `block_on()`. Instead:
1. Spawn a background task that runs in the runtime
2. This task has a command loop that receives commands via channel
3. Commands are executed with `.await` (works because task is in runtime)
4. Results are sent back via blocking channel
5. Public API blocks waiting for result, but async work happens in runtime

## Recommended Fix for Nameless

Refactor `RoomService` to match Hopp's pattern:

1. **Spawn background command handler** when creating RoomService
2. **Use channels** for commands/results instead of `block_on()`
3. **All async operations** run in the background task (can use `.await`)
4. **Public API** blocks waiting for results via channel

This ensures:
- ✅ Runtime stays active (background task always running)
- ✅ Async operations work properly (run in runtime context)
- ✅ No `block_on()` issues
- ✅ Clean API (blocking from caller's perspective, async internally)

