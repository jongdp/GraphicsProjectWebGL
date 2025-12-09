attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec3 a_Color;
attribute vec2 a_TexCoord;

uniform mat4 u_Model;
uniform mat4 u_World;
uniform mat4 u_Camera;
uniform mat4 u_Projective;

varying vec3 v_Position;   // model-space position
varying vec3 v_Normal;
varying vec3 v_Color;
varying vec2 v_TexCoord;

void main() {
    // Pass through per-vertex attributes
    v_Position = a_Position;
    v_Normal   = a_Normal;
    v_Color    = a_Color;
    v_TexCoord = a_TexCoord;

    // Standard MVP transform for the main camera
    gl_Position = u_Projective * u_Camera * u_World * u_Model * vec4(a_Position, 1.0);
}
