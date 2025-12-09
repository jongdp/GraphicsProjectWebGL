precision highp float;

varying vec3 v_ViewPosition;

// Pack a single float in [0,1] into RGBA
vec4 encodeFloat(float value) {
    vec4 bitShift = vec4(
        256.0 * 256.0 * 256.0,
        256.0 * 256.0,
        256.0,
        1.0
    );
    vec4 comp = fract(value * bitShift);
    comp.w -= comp.z * (1.0 / 256.0);
    comp.z -= comp.y * (1.0 / 256.0);
    comp.y -= comp.x * (1.0 / 256.0);
    return comp;
}

void main() {
    // v_ViewPosition.z is NDC z in [-1,1] from the light's POV.
    // Map it into [0,1] so we can safely pack it.
    float depthNDC = v_ViewPosition.z;
    float depth01  = depthNDC * 0.5 + 0.5;

    gl_FragColor = encodeFloat(depth01);
    

    // For debugging, you could visualize:
    // gl_FragColor = vec4(vec3(depth01), 1.0);
}
