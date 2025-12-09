precision highp float;

// Varyings from the vertex shader
varying vec3 v_Position;   // model-space
varying vec3 v_Normal;
varying vec3 v_Color;
varying vec2 v_TexCoord;

// Shadow map + sampling info
uniform sampler2D u_ShadowTexture;
uniform float     u_ShadowTexelSize;

// Matrices
uniform mat4 u_Model;
uniform mat4 u_World;
uniform mat4 u_Camera;
uniform mat4 u_ModelWorldInverseTranspose;
uniform mat4 u_LightTransform;

// Lighting uniforms
uniform vec3  u_Light;       // light position in world space
uniform vec3  u_AmbientColor;
uniform vec3  u_DiffuseColor;
uniform vec3  u_SpecColor;
uniform float u_SpecPower;

// Texturing controls
uniform sampler2D u_Texture;
uniform int       u_UseTexture;  // 1 = use u_Texture, 0 = no texture

// --------------------------------------------------
// Depth unpack helper (must match shadowmap.frag's encodeFloat)
// --------------------------------------------------
float decodeFloat(vec4 rgba) {
    vec4 bitShift = vec4(
        1.0 / (256.0 * 256.0 * 256.0),
        1.0 / (256.0 * 256.0),
        1.0 / 256.0,
        1.0
    );
    return dot(rgba, bitShift);
}

// --------------------------------------------------
// Shadow computation (matches shadowmap.frag depth convention)
// --------------------------------------------------
float computeShadowFactor(vec3 worldPos) {
    // Transform world-space position into light clip-space
    vec4 lightClip = u_LightTransform * vec4(worldPos, 1.0);

    // Perspective divide -> NDC [-1, 1]
    vec3 ndc = lightClip.xyz / lightClip.w;

    // Map NDC z [-1,1] -> [0,1] (must match shadowmap.frag)
    float depth01 = ndc.z * 0.5 + 0.5;

    // Convert xy NDC -> UV [0,1]
    vec2 baseUV = ndc.xy * 0.5 + 0.5;

    // Outside the light frustum? Treat as lit (no shadow)
    if (baseUV.x < 0.0 || baseUV.x > 1.0 ||
        baseUV.y < 0.0 || baseUV.y > 1.0 ||
        depth01  < 0.0 || depth01  > 1.0) {
        return 1.0;
    }

    // Small depth bias to prevent acne
    float bias = 0.002;

    // PCF kernel radius (3x3)
    const int range = 1;
    float samples = 0.0;
    float lit     = 0.0;

    for (int i = -range; i <= range; ++i) {
        for (int j = -range; j <= range; ++j) {
            vec2 uv = baseUV + vec2(float(i), float(j)) * u_ShadowTexelSize;
            vec4 shadowSample = texture2D(u_ShadowTexture, uv);
            float storedDepth = decodeFloat(shadowSample);

            samples += 1.0;

            // If the fragment is not farther than the stored depth (with bias),
            // that sample considers it lit.
            if (depth01 - bias <= storedDepth) {
                lit += 1.0;
            }
        }
    }

    return lit / samples;  // 1 = fully lit, 0 = fully shadowed
}

// --------------------------------------------------
// Main lighting calculation
// --------------------------------------------------
void main() {
    // Compute world-space position and normal
    vec3 worldPos    = vec3(u_World * u_Model * vec4(v_Position, 1.0));
    vec3 worldNormal = normalize(vec3(u_ModelWorldInverseTranspose * vec4(v_Normal, 0.0)));

    // Light direction (point light)
    vec3 L = normalize(u_Light - worldPos);

    // Approximate view direction (assuming camera near origin)
    vec3 V = normalize(-worldPos);
    vec3 H = normalize(L + V);

    float NdotL = max(dot(worldNormal, L), 0.0);
    float NdotH = max(dot(worldNormal, H), 0.0);

    // --- Base material color ---
    // Start from uniform diffuse color
    vec3 baseColor = u_DiffuseColor;

    if (u_UseTexture == 1) {
        // Textured objects (dragon/python) ignore per-vertex colors:
        // color comes from diffuse * texture
        vec3 texColor = texture2D(u_Texture, v_TexCoord).rgb;
        baseColor *= texColor;
    } else {
        // Non-textured objects (arches, terrain) use per-vertex color
        // multiplied by the diffuse color to keep their tint.
        baseColor *= v_Color;
    }

    // Phong/Blinn-Phong shading
    vec3 ambient  = u_AmbientColor * baseColor;
    vec3 diffuse  = baseColor * NdotL;
    vec3 specular = u_SpecColor * pow(NdotH, u_SpecPower);

    // Shadow factor: 1 = fully lit, 0 = fully shadowed
    float shadow = computeShadowFactor(worldPos);

    // Apply shadow only to direct light (diffuse + specular)
    vec3 finalColor = ambient + shadow * (diffuse + specular);

    gl_FragColor = vec4(finalColor, 1.0);
}
