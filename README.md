# Real-Time 3D Renderer with Shadow Mapping

A WebGL scene of a dragon circling a ball python over procedurally generated terrain, lit by a movable light that casts soft shadows in real time. Written in JavaScript and GLSL with no 3D engine.

## Highlights

- **Two-pass shadow mapping.** Scene depth is rendered from the light into a 4096×4096 offscreen framebuffer, then sampled for every pixel during lighting.
- **Depth packed into RGBA.** WebGL 1 doesn't guarantee float textures, so depth is split across four 8-bit color channels and reassembled in the shader.
- **Soft shadow edges.** A 3×3 percentage-closer filtering kernel softens edges, and a depth bias removes shadow acne.
- **Blinn-Phong lighting** over textured OBJ models.
- **Hierarchical animation.** The dragon's wings flap about computed shoulder pivots as it orbits, and the python slithers in a traveling S-curve.
- **Interactive light.** Move it with sliders and watch the shadows update in real time.


## Controls
 
| Input | Action |
| --- | --- |
| `W` / `S` | Move forward / back |
| `A` / `D` | Move left / right |
| `R` / `F` | Move up / down |
| `↑` / `↓` | Look up / down |
| `←` / `→` | Turn left / right |
| Light X / Y / Z sliders | Move the light |
| Python slider | Move the python along the z-axis |

### Animation
 
- **Dragon:** the OBJ file is split by group into the body, left wing, and right wing. Each wing's pivot is computed from its bounding box near the shoulder rather than its center, so the wing rotates at the joint: translate to the pivot, rotate, translate back. The wings are drawn relative to the dragon's transform as it orbits inside the rotating arches.
- **Python:** the body is split into sections ordered head to tail. Each section rotates about its own pivot by a sine wave whose phase shifts along the body, producing a traveling S-curve.


## Credits
 
Built for the final project of Northwestern's Computer Graphics course (COMP_SCI 351), Fall 2025. The scene, shaders, shadow pipeline, and animation are my own work. The following came from the course or third parties:
 
- `lib/cuon-utils-cs351.js`, `lib/cuon-algebra-cs351.js`: matrix and shader utilities by Kanda and Matsuda, from *WebGL Programming Guide*, extended by course staff (including OBJ loading)
- `lib/webgl-utils.js`, `lib/webgl-debug.js`: WebGL helper libraries (see license headers in each file)
- `terrain.js`: terrain generator by course staff (Evan Bertis-Sample and Dietrich Geisler)