use crate::{capture::capturer::ScreenshareExt, utils::geometry::Extent};

pub struct ScreenshareFunctions {}

impl ScreenshareExt for ScreenshareFunctions {
    fn get_monitor_size(monitors: &[winit::monitor::MonitorHandle], input_id: u32) -> Extent {
        Extent {
            width: 0.,
            height: 0.,
        }
    }

    fn get_selected_monitor(
        monitors: &[winit::monitor::MonitorHandle],
        input_id: u32,
    ) -> winit::monitor::MonitorHandle {
        monitors[0].clone()
    }
}

impl Default for ScreenshareFunctions {
    fn default() -> Self {
        Self::new()
    }
}

impl ScreenshareFunctions {
    pub fn new() -> Self {
        Self {}
    }
}
