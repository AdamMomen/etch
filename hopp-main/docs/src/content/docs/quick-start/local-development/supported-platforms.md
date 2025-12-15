---
title: Supported Platforms
description: Supported platforms for local development
---

## Current status

Hopp is fully supported on the following platforms:

- macOS
- Windows

## Linux support

Our goal is to make Hopp truly cross-platform and support Linux. Currently, you can build Hopp
on Linux, but it is not working properly due to missing functionality.

The main problem is that `webkitgtk` doesn't support WebRTC yet, which is a major issue for Hopp
as we rely on the browser for audio handling and subscribing to the video stream in the controller view.
You can read more in [this Tauri issue](https://github.com/tauri-apps/tauri/issues/13143).

One solution would be to wait for [this feature](https://github.com/tauri-apps/wry/issues/1064#issuecomment-2219332720) to land.

Another approach could be to make the Linux client a hybrid browser client + desktop app. This would allow us to use the desktop app for screen sharing and the browser for audio and watching the video stream.

Alternatively, we could move everything WebRTC-related to Rust and use the browser just for showing the video stream.

Another, less critical problem is that we can't have the overlay surface, which we use for
drawing the virtual cursors. This is because we are using a fullscreen window, which can't be
transparent on Wayland (see [here](https://gitlab.freedesktop.org/wayland/wayland-protocols/-/issues/116)). The situation here is better than the WebRTC issue, because there is an open
[PR](https://github.com/rust-windowing/winit/pull/4044) on winit that will fix this.

If someone still wants to work on our Linux client, they could start by implementing the
cursor and keyboard simulation, which should be doable even today.

##### Dependencies

On Linux, you need to install the following packages:

```
libasound2-dev libglib2.0-dev
```
