//! NAMELESS Core - Entry point
//!
//! This binary is spawned by the Tauri app and communicates via Unix socket.
//! It owns all media: screen capture, LiveKit connection, annotations overlay.

use std::env;

use nameless_core::{Application, UserEvent};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop, EventLoopProxy};
use winit::window::WindowId;

/// Application handler for winit event loop
struct AppHandler {
    app: Option<Application>,
    socket_path: String,
    event_loop_proxy: EventLoopProxy<UserEvent>,
    initialized: bool,
}

impl AppHandler {
    fn new(socket_path: String, event_loop_proxy: EventLoopProxy<UserEvent>) -> Self {
        Self {
            app: None,
            socket_path,
            event_loop_proxy,
            initialized: false,
        }
    }
}

impl ApplicationHandler<UserEvent> for AppHandler {
    fn resumed(&mut self, _event_loop: &ActiveEventLoop) {
        if !self.initialized {
            // Create application on first resume
            let proxy = self.event_loop_proxy.clone();
            let app = Application::new(proxy.clone());

            // Initialize socket in background
            let socket_path = self.socket_path.clone();
            let proxy_clone = proxy.clone();
            tokio::spawn(async move {
                // Small delay to ensure event loop is running
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                // Create a temporary mutable reference for socket init
                // In practice, we'd need to restructure this - for now, log the intent
                tracing::info!("Socket initialization requested for path: {}", socket_path);

                // Send connected event when ready
                let _ = proxy_clone.send_event(UserEvent::SocketConnected);
            });

            self.app = Some(app);
            self.initialized = true;

            tracing::info!("Core application initialized");
        }
    }

    fn user_event(&mut self, event_loop: &ActiveEventLoop, event: UserEvent) {
        if let Some(app) = &mut self.app {
            app.handle_user_event(event, event_loop);
        }
    }

    fn window_event(
        &mut self,
        _event_loop: &ActiveEventLoop,
        _window_id: WindowId,
        event: WindowEvent,
    ) {
        // Handle window events for overlay window when implemented
        match event {
            WindowEvent::CloseRequested => {
                tracing::info!("Window close requested");
            }
            WindowEvent::RedrawRequested => {
                // Redraw overlay when graphics context is implemented
            }
            _ => {}
        }
    }

    fn about_to_wait(&mut self, _event_loop: &ActiveEventLoop) {
        // Called when event loop is about to wait for new events
        // Can be used for idle processing
    }
}

fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "nameless_core=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("NAMELESS Core starting...");

    // Get socket path from command line or environment
    let socket_path = env::args()
        .nth(1)
        .or_else(|| env::var("NAMELESS_SOCKET_PATH").ok())
        .unwrap_or_else(|| {
            let pid = std::process::id();
            #[cfg(unix)]
            {
                format!("/tmp/nameless-core-{}.sock", pid)
            }
            #[cfg(windows)]
            {
                format!("\\\\.\\pipe\\nameless-core-{}", pid)
            }
        });

    tracing::info!("Socket path: {}", socket_path);

    // Initialize tokio runtime for async operations
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;

    // Enter tokio runtime context
    let _guard = runtime.enter();

    // Create winit event loop with custom UserEvent
    let event_loop: EventLoop<UserEvent> = EventLoop::with_user_event().build()?;
    event_loop.set_control_flow(ControlFlow::Wait);

    // Get the proxy before moving event_loop
    let event_loop_proxy = event_loop.create_proxy();

    // Create application handler
    let mut handler = AppHandler::new(socket_path, event_loop_proxy);

    // Run event loop
    tracing::info!("Starting event loop...");
    event_loop.run_app(&mut handler)?;

    tracing::info!("NAMELESS Core exited");
    Ok(())
}
