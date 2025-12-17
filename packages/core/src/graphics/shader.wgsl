// Simple shader for rendering colored rectangles
// Used for spike validation and future annotation rendering

struct VertexInput {
    @location(0) position: vec2<f32>,
    @location(1) color: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    // Position is in clip space (-1 to 1)
    out.clip_position = vec4<f32>(input.position, 0.0, 1.0);
    out.color = input.color;
    return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
    // Output color with premultiplied alpha for transparency
    return vec4<f32>(
        input.color.rgb * input.color.a,
        input.color.a
    );
}
