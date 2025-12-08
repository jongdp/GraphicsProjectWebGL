precision highp float;

uniform sampler2D u_Texture;
uniform bool u_UseTexture;

varying vec3 v_Color;
varying vec2 v_TexCoord;

void main() {
    if (u_UseTexture) {
        gl_FragColor = texture2D(u_Texture, v_TexCoord);
    } else {
        gl_FragColor = vec4(v_Color, 1.0);
    }
}