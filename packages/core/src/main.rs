//! Etch Core - Entry point
//!
//! This binary is spawned by the Tauri app and communicates via Unix socket.
//! It owns all media: screen capture, LiveKit connection.

use std::env;
use std::sync::Arc;

use etch_core::{Application, CoreSocket, UserEvent};
use parking_lot::Mutex;
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
    socket: Arc<Mutex<Option<CoreSocket>>>,
}

impl AppHandler {
    fn new(socket_path: String, event_loop_proxy: EventLoopProxy<UserEvent>) -> Self {
        Self {
            app: None,
            socket_path,
            event_loop_proxy,
            initialized: false,
            socket: Arc::new(Mutex::new(None)),
        }
    }
}

impl ApplicationHandler<UserEvent> for AppHandler {
    fn resumed(&mut self, _event_loop: &ActiveEventLoop) {
        if !self.initialized {
            // Create application on first resume, sharing the socket Arc
            let proxy = self.event_loop_proxy.clone();
            let app = Application::new(proxy.clone(), self.socket.clone());

            // Initialize socket server
            let socket_path = self.socket_path.clone();
            let socket_holder = self.socket.clone();

            tokio::spawn(async move {
                // Small delay to ensure event loop is running
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                match CoreSocket::new(&socket_path, proxy.clone()).await {
                    Ok(socket) => {
                        tracing::info!("Socket server started on: {}", socket_path);
                        *socket_holder.lock() = Some(socket);
                    }
                    Err(e) => {
                        tracing::error!("Failed to start socket server: {}", e);
                        let _ = proxy.send_event(UserEvent::Error {
                            code: "socket_init_failed".to_string(),
                            message: e.to_string(),
                        });
                    }
                }
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
        _event: WindowEvent,
    ) {
        // No windows managed by Core anymore - overlay rendering moved to Tauri WebView
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
                .unwrap_or_else(|_| "etch_core=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Etch Core starting...");

    // Get socket path from command line or environment
    let socket_path = env::args()
        .nth(1)
        .or_else(|| env::var("Etch_SOCKET_PATH").ok())
        .unwrap_or_else(|| {
            let pid = std::process::id();
            #[cfg(unix)]
            {
                format!("/tmp/etch-core-{}.sock", pid)
            }
            #[cfg(windows)]
            {
                format!("\\\\.\\pipe\\etch-core-{}", pid)
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

    tracing::info!("Etch Core exited");
    Ok(())
}
