fn main() {
    // macOS: Add -ObjC linker flag required for LiveKit/WebRTC ObjectiveC categories
    // Without this, WebRTC's RTCVideoCodecInfo methods won't be found at runtime
    // causing: "unrecognized selector sent to instance" crashes
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rustc-link-arg=-ObjC");
    }
}
