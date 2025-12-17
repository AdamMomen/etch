mod screen_share;

use screen_share::CoreState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .manage(CoreState::default())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      screen_share::get_platform,
      screen_share::minimize_main_window,
      screen_share::restore_main_window,
      screen_share::get_window_monitor,
      screen_share::spawn_core,
      screen_share::kill_core,
      screen_share::send_core_message,
      screen_share::is_core_running,
      screen_share::check_screen_permission,
      // Annotation overlay commands (Story 3.6)
      screen_share::create_annotation_overlay,
      screen_share::destroy_annotation_overlay,
      screen_share::update_overlay_bounds,
      screen_share::is_overlay_active,
      screen_share::get_window_bounds_by_title,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
