use std::env;

fn main() {
    println!("cargo:rerun-if-env-changed=HOPP_CORE_BIN_DEFAULT");
    let is_default = env::var("HOPP_CORE_BIN_DEFAULT").unwrap_or("0".to_string()) == "1";
    let binary_name = if is_default {
        "hopp_core"
    } else {
        let target = env::var("TARGET").unwrap();
        match target.as_str() {
            "x86_64-apple-darwin" => "hopp_core-x86_64-apple-darwin",
            "aarch64-apple-darwin" => "hopp_core-aarch64-apple-darwin",
            "aarch64-pc-windows-msvc" => "hopp_core-aarch64-pc-windows-msvc",
            "x86_64-pc-windows-msvc" => "hopp_core-x86_64-pc-windows-msvc",
            "aarch64-unknown-linux-gnu" => "hopp_core-aarch64-unknown-linux-gnu",
            "x86_64-unknown-linux-gnu" => "hopp_core-x86_64-unknown-linux-gnu",
            _ => "hopp_core",
        }
    };

    let profile = env::var("PROFILE").unwrap();
    let output_dir = if profile == "release" {
        "target/release"
    } else {
        "target/debug"
    };

    let target = env::var("TARGET").unwrap();
    if target.contains("windows") {
        // Windows uses /OUT:filename.exe
        let binary_name = format!("{binary_name}.exe");
        println!("cargo:rustc-link-arg-bin=hopp_core=/OUT:{output_dir}/{binary_name}");
    } else {
        // Unix systems use -o filename
        println!("cargo:rustc-link-arg-bin=hopp_core=-o");
        println!("cargo:rustc-link-arg-bin=hopp_core={output_dir}/{binary_name}");
    }
}
