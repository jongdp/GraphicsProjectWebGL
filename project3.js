// Last edited by Jonathan Garcia de Paz 2025

// Global reference to the webGL context and the canvas
let g_canvas;
let gl;

// ---------- Shader source globals ----------
let g_vshaderShadow;
let g_fshaderShadow;
let g_vshaderLighting;
let g_fshaderLighting;
let g_vshaderFlat;
let g_fshaderFlat;

// ---------- Program handles ----------
let g_programShadow;
let g_programLighting;
let g_programFlat;

// Global to keep track of the time of the _previous_ frame
let g_lastFrameMS = 0;

// Globals to track if the given list of keys are pressed
let g_keysPressed = {};
const KEYS_TO_TRACK = ['w', 'a', 's', 'd', 'r', 'f', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// ---------- GLSL uniform references ----------
// Shadow pass
let g_uShadowModel_ref;
let g_uShadowWorld_ref;
let g_uShadowCamera_ref;
let g_uShadowProjection_ref;

// Lighting pass
let g_uLightModel_ref;
let g_uLightWorld_ref;
let g_uLightCamera_ref;
let g_uLightProjection_ref;
let g_uLightModelWorldInvTrans_ref;
let g_uShadowTexture_ref;
let g_uShadowTexelSize_ref;
let g_uLightTransform_ref;
let g_uLightPos_ref;
let g_uAmbientColor_ref;
let g_uDiffuseColor_ref;
let g_uSpecPower_ref;
let g_uSpecColor_ref;
let g_uTexture_ref;
let g_uUseTexture_ref;

// Flat pass
let g_uFlatModel_ref;
let g_uFlatWorld_ref;
let g_uFlatCamera_ref;
let g_uFlatProjection_ref;
let g_uFlatColor_ref;

// Matrices
let g_dragonMatrix;
let g_dragonBaseMatrix;   // base pose for orbiting dragon
let g_dragonWingLMatrix;
let g_dragonWingRMatrix;
let g_archesMatrix;
let g_pythonBaseMatrix;
let g_pythonMatrix;       // kept but no longer used for animation
let g_terrainMatrix;
let g_projectionMatrix;
let g_worldMatrix;

// Wing pivot points in dragon's object space
let g_wingLPivot;
let g_wingRPivot;

// Shadow projection matrix (from light POV)
let g_shadowProjectionMatrix;

// Object information (Mesh, Normals, and Texture Coordinates)
let g_dragonMesh;
let g_dragonWingLMesh;
let g_dragonWingRMesh;
let g_archesMesh;
let g_pythonMesh;
let g_terrainMesh;
let g_gridMesh;

let g_dragonNormals;
let g_dragonWingLNormals;
let g_dragonWingRNormals;
let g_archesNormals;
let g_pythonNormals;

// Per-vertex colors
let g_gridColors;
let g_dragonColors;
let g_dragonWingLColors;
let g_dragonWingRColors;
let g_archesColors;
let g_pythonColors;

// Texture coordinates
let g_dragonTextureCoords;
let g_dragonWingLTextureCoords;
let g_dragonWingRTextureCoords;
let g_archesTextureCoords;
let g_pythonTextureCoords;

// Texture Images
let g_dragonImage;
let g_pythonImage;

// Texture Globals
let g_dragonTexture;
let g_pythonTexture;

// Keep track of the camera position
let g_cameraHeight;
let g_cameraYaw;
let g_cameraPitch;

let g_cameraPos;
let g_cameraForward;
let g_cameraRight;
let g_cameraUp;

// Light + material globals
let g_lightPosition;
let g_specPower;

// Shadow map framebuffer + texture
let g_framebuffer;
let g_shadowTexture;

// Shadow map resolution
const SHADOW_MAP_WIDTH = 4096;
const SHADOW_MAP_HEIGHT = 4096;

// The size in bytes of a floating point
const FLOAT_SIZE = 4;

// Offsets into the VBO (in vertices)
let g_DRAGON_OFFSET = 0;
let g_DRAGON_WING_L_OFFSET = 0;
let g_DRAGON_WING_R_OFFSET = 0;
let g_ARCHES_OFFSET = 0;
let g_PYTHON_OFFSET = 0;
let g_TERRAIN_OFFSET = 0;
let g_GRID_OFFSET = 0;

// Float counts for VBO sections
let g_TOTAL_POSITION_FLOATS = 0;
let g_TOTAL_NORMAL_FLOATS = 0;
let g_TOTAL_COLOR_FLOATS = 0;
let g_TOTAL_TEXCOORD_FLOATS = 0;

// Grid constants

// How far in the X and Z directions the grid should extend
// Recall that the camera "rests" on the X/Z plane, since Z is "out" from the camera
const GRID_X_RANGE = 1000;
const GRID_Z_RANGE = 1000;

// Dragon orbit angle (in degrees) around the center of the arches
let g_dragonOrbitAngle = 0.0;

// Python slider Z offset (we'll rebuild its matrices each frame)
let g_pythonSliderZ = 0.0;

// List of python sections in "spine order" (head → tail)
const PYTHON_SECTIONS = [
    'Head',
    'Section1', 'Section32', 'Section14', 'Section21', 'Section18',
    'Section9', 'Section13', 'Section5', 'Section25', 'Section17',
    'Section29', 'Section2', 'Section3', 'Section4', 'Section6',
    'Section7', 'Section8', 'Section10', 'Section11', 'Section12',
    'Section16', 'Section15', 'Section20', 'Section19', 'Section22',
    'Section23', 'Section24', 'Section26', 'Section27', 'Section28',
    'Section30', 'Section31'
];

// For each python section: { offset, count, pivot }
let g_pythonSectionInfo = {};
// Per-frame matrices for each section: name -> Matrix4
let g_pythonSectionMatrices = {};
// Spine order computed from pivots (head → tail)
let g_pythonSpineOrder = null;

function main() {
    // Setup for slider
    let slider_input = document.getElementById('sliderPython');
    if (slider_input) {
        slider_input.addEventListener('input', (event) => {
            updatePythonPos(event.target.value);
        });
    }

    // Setup sliders for light position (if present in HTML)
    let sliderLightX = document.getElementById('sliderLightX');
    if (sliderLightX) {
        sliderLightX.addEventListener('input', (event) => {
            const v = Number(event.target.value);
            if (g_lightPosition) {
                g_lightPosition.elements[0] = v;
            }
            let label = document.getElementById('LightX');
            if (label) {
                label.textContent = `Light X: ${v.toFixed(1)}`;
            }
        });
    }

    let sliderLightY = document.getElementById('sliderLightY');
    if (sliderLightY) {
        sliderLightY.addEventListener('input', (event) => {
            const v = Number(event.target.value);
            if (g_lightPosition) {
                g_lightPosition.elements[1] = v;
            }
            let label = document.getElementById('LightY');
            if (label) {
                label.textContent = `Light Y: ${v.toFixed(1)}`;
            }
        });
    }

    let sliderLightZ = document.getElementById('sliderLightZ');
    if (sliderLightZ) {
        sliderLightZ.addEventListener('input', (event) => {
            const v = Number(event.target.value);
            if (g_lightPosition) {
                g_lightPosition.elements[2] = v;
            }
            let label = document.getElementById('LightZ');
            if (label) {
                label.textContent = `Light Z: ${v.toFixed(1)}`;
            }
        });
    }

    // Keep track of time each frame by starting with our current time
    g_lastFrameMS = Date.now();

    g_canvas = document.getElementById('canvas');

    // Get the rendering context for WebGL
    gl = getWebGLContext(g_canvas, true);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Setup our reactions from keys
    setupKeyBinds();

    // We will call this at the end of most main functions from now on
    loadOBJFiles();
}

/*
 * Helper function to load OBJ files in sequence
 * For much larger files, you may are welcome to make this more parallel
 * I made everything sequential for this class to make the logic easier to follow
 */
async function loadOBJFiles() {
    // open our OBJ file(s)
    let dragonData = await fetch('./resources/dragon.obj').then(response => response.text()).then((x) => x);
    let archesData = await fetch('./resources/arches.obj').then(response => response.text()).then((x) => x);
    let pythonData = await fetch('./resources/ballpython.obj').then(response => response.text()).then((x) => x);

    // will have to add dictionaries {} to get the different parts then allocate them to the meshes
    let dragonMesh = {};
    let archesMesh = {};
    let pythonMesh = {};

    let dragonNormals = {};
    let archesNormals = {};
    let pythonNormals = {};

    let dragonTextureCoords = {};
    let archesTextureCoords = {};
    let pythonTextureCoords = {};

    g_dragonMesh = [];
    g_dragonWingLMesh = [];
    g_dragonWingRMesh = [];
    g_archesMesh = [];
    g_pythonMesh = [];

    g_dragonNormals = [];
    g_dragonWingLNormals = [];
    g_dragonWingRNormals = [];
    g_archesNormals = [];
    g_pythonNormals = [];

    g_dragonTextureCoords = [];
    g_dragonWingLTextureCoords = [];
    g_dragonWingRTextureCoords = [];
    g_archesTextureCoords = [];
    g_pythonTextureCoords = [];

    // Read the obj meshes
    readObjFileByGroup(dragonData, dragonMesh, dragonNormals, dragonTextureCoords);
    readObjFileByGroup(archesData, archesMesh, archesNormals, archesTextureCoords);
    readObjFileByGroup(pythonData, pythonMesh, pythonNormals, pythonTextureCoords);
    
    // Creating the color arrays to send to the VBO
    g_dragonColors = [];
    g_dragonWingLColors = [];
    g_dragonWingRColors = [];
    g_archesColors = [];
    g_pythonColors = [];

    // Loop through and allocate the parts to the proper meshes along with the colors
    for (let key in dragonMesh) {
        // Treat all "Wing*L" groups as the left wing
        if (key.startsWith('Wing') && key.endsWith('L')) {
            g_dragonWingLMesh = g_dragonWingLMesh.concat(dragonMesh[key]);
            g_dragonWingLColors = g_dragonWingLColors.concat(
                buildColorAttributes(dragonMesh[key].length / 3)
            );
            g_dragonWingLNormals = g_dragonWingLNormals.concat(dragonNormals[key]);
            g_dragonWingLTextureCoords = g_dragonWingLTextureCoords.concat(dragonTextureCoords[key]);
        }
        // Treat all "Wing*R" groups as the right wing
        else if (key.startsWith('Wing') && key.endsWith('R')) {
            g_dragonWingRMesh = g_dragonWingRMesh.concat(dragonMesh[key]);
            g_dragonWingRColors = g_dragonWingRColors.concat(
                buildColorAttributes(dragonMesh[key].length / 3)
            );
            g_dragonWingRNormals = g_dragonWingRNormals.concat(dragonNormals[key]);
            g_dragonWingRTextureCoords = g_dragonWingRTextureCoords.concat(dragonTextureCoords[key]);
        }
        // Everything else is part of the main dragon body (including the head now)
        else {
            g_dragonMesh = g_dragonMesh.concat(dragonMesh[key]);
            g_dragonColors = g_dragonColors.concat(
                buildColorAttributes(dragonMesh[key].length / 3)
            );
            g_dragonNormals = g_dragonNormals.concat(dragonNormals[key]);
            g_dragonTextureCoords = g_dragonTextureCoords.concat(dragonTextureCoords[key]);
        }
    }

    // Compute wing pivot points from their geometry (object space),
    // using a pivot closer to the "shoulder" instead of the centroid.
    g_wingLPivot = computeWingPivot(g_dragonWingLMesh);
    g_wingRPivot = computeWingPivot(g_dragonWingRMesh);

    for (let key in archesMesh) {
        g_archesMesh = g_archesMesh.concat(archesMesh[key]);
        g_archesColors = g_archesColors.concat(buildColorAttributes(archesMesh[key].length / 3));

        g_archesNormals = g_archesNormals.concat(archesNormals[key]);
        g_archesTextureCoords = g_archesTextureCoords.concat(archesTextureCoords[key]);
    }

    // ----- Python: keep per-section info for S-curve slither -----
    g_pythonSectionInfo = {};
    let pythonVertsOffsetRunning = 0; // in vertices

    for (let name of PYTHON_SECTIONS) {
        const mesh = pythonMesh[name];
        if (!mesh) continue;

        const normals   = pythonNormals[name] || [];
        const texcoords = pythonTextureCoords[name] || [];
        const vertexCount = mesh.length / 3;

        // centroid in object space => pivot for that section
        const pivot = computeMeshCentroid(mesh);

        // append to the global python arrays in this order
        g_pythonMesh          = g_pythonMesh.concat(mesh);
        g_pythonNormals       = g_pythonNormals.concat(normals);
        g_pythonTextureCoords = g_pythonTextureCoords.concat(texcoords);
        g_pythonColors        = g_pythonColors.concat(
            buildPerVertexColorAttributes(vertexCount)
        );

        // record offset + count + pivot
        g_pythonSectionInfo[name] = {
            offset: pythonVertsOffsetRunning,
            count:  vertexCount,
            pivot:  pivot
        };

        pythonVertsOffsetRunning += vertexCount;
    }

    console.log('Python section info:', g_pythonSectionInfo);
    // Start our first frame
    loadImageFiles();
}

/*
 * Helper function to _synchronously_ load image files
 * This can make you quite sad the first time loading an image...
 * But for this class it's "good enough"
 * Feel free to make this asynchronous of course
 * Helpful reference if needed:
 * https://webglfundamentals.org/webgl/lessons/webgl-3d-textures.html
 */
async function loadImageFiles() {
    g_dragonImage = new Image();
    g_pythonImage = new Image();

    g_dragonImage.src = "resources/dragontexture1.png";
    g_pythonImage.src = "resources/ballpython_texture.png";

    // wait for all images to load
    await g_dragonImage.decode();
    await g_pythonImage.decode();
    
    // then load the GLSL files
    loadGLSLFiles();
}

/*
 * Helper function to load our GLSL files for compiling in sequence
 * We now use the shadowmap + smoothed lighting + flat shaders
 */
async function loadGLSLFiles() {
    g_vshaderShadow   = await fetch('./shaders/shadowmap.vert').then(r => r.text()).then(x => x);
    g_fshaderShadow   = await fetch('./shaders/shadowmap.frag').then(r => r.text()).then(x => x);
    g_vshaderLighting = await fetch('./shaders/shadow_light_smoothed.vert').then(r => r.text()).then(x => x);
    g_fshaderLighting = await fetch('./shaders/shadow_light_smoothed.frag').then(r => r.text()).then(x => x);
    g_vshaderFlat     = await fetch('./shaders/flat.vert').then(r => r.text()).then(x => x);
    g_fshaderFlat     = await fetch('./shaders/flat.frag').then(r => r.text()).then(x => x);

    // wait until everything is loaded before rendering
    startRendering();
}

function startRendering() {
    // Initialize GPU's vertex and fragment shaders programs (now three separate programs)
    g_programShadow   = createProgram(gl, g_vshaderShadow,   g_fshaderShadow);
    g_programLighting = createProgram(gl, g_vshaderLighting, g_fshaderLighting);
    g_programFlat     = createProgram(gl, g_vshaderFlat,     g_fshaderFlat);

    // Verify that the development environment was set up correctly
    if (!g_programShadow || !g_programLighting || !g_programFlat) {
        console.log('Failed to initialize shader programs for practical 3');
        return;
    }

    // Build a data-driven python spine order based on section pivot positions
    buildPythonSpineOrder();

    // build a grid model with colors
    [g_gridMesh, g_gridColors] = buildGridAttributes(1, 1, [0, 1, 0]);

    // class for building the terrain mesh
    let terrainGenerator = new TerrainGenerator();

    // constant seed
    // you can mess with this if you want a different terrain
    let seed = 3000;

    // Setup the options for our terrain generation
    let options = { 
        width: 100, 
        height: 5, 
        depth: 100, 
        seed: seed, 
        noisefn: "perlin", // Options include "simplex", "wave", and "perlin"
        roughness: 10 
    };

    // construct a terrain mesh of an array of 3-vectors
    let terrain = terrainGenerator.generateTerrainMesh(options);

    // give basic height-based colors based on the 3-vertex specified terrain
    let terrainColors = buildTerrainColors(terrain, options.height);

    // "flatten" the terrain above to construct our usual global mesh
    g_terrainMesh = [];
    for (let i = 0; i < terrain.length; i++) {
        g_terrainMesh.push(...terrain[i]);
    }

    // Build per-vertex normals for terrain and grid (simple upward normals here)
    let terrainNormals = makeUpNormals(g_terrainMesh.length / 3);
    let gridNormals    = makeUpNormals(g_gridMesh.length / 3);

    // Send our data to the GPU
    // Layout in the VBO: [positions][normals][colors][texcoords]
    let positions = g_dragonMesh
        .concat(g_dragonWingLMesh)
        .concat(g_dragonWingRMesh)
        .concat(g_archesMesh)
        .concat(g_pythonMesh)
        .concat(g_terrainMesh)
        .concat(g_gridMesh);

    let normals = g_dragonNormals
        .concat(g_dragonWingLNormals)
        .concat(g_dragonWingRNormals)
        .concat(g_archesNormals)
        .concat(g_pythonNormals)
        .concat(terrainNormals)
        .concat(gridNormals);

    let colors = g_dragonColors
        .concat(g_dragonWingLColors)
        .concat(g_dragonWingRColors)
        .concat(g_archesColors)
        .concat(g_pythonColors)
        .concat(terrainColors)
        .concat(g_gridColors);

    let texcoords = g_dragonTextureCoords
        .concat(g_dragonWingLTextureCoords)
        .concat(g_dragonWingRTextureCoords)
        .concat(g_archesTextureCoords)
        .concat(g_pythonTextureCoords)
        .concat(makeDummyTexCoords(g_terrainMesh.length / 3))
        .concat(makeDummyTexCoords(g_gridMesh.length / 3));

    // Cache counts for position/normals/colors/texcoords
    g_TOTAL_POSITION_FLOATS = positions.length;
    g_TOTAL_NORMAL_FLOATS   = normals.length;
    g_TOTAL_COLOR_FLOATS    = colors.length;
    g_TOTAL_TEXCOORD_FLOATS = texcoords.length;

    // Concatenate into one big buffer
    let data = positions
        .concat(normals)
        .concat(colors)
        .concat(texcoords);

    // Setup the VBO
    if (!initVBO(new Float32Array(data))) {
        return;
    }

    // Compute "vertex offsets" into the position block
    let dragonVerts      = g_dragonMesh.length / 3;
    let wingLVerts       = g_dragonWingLMesh.length / 3;
    let wingRVerts       = g_dragonWingRMesh.length / 3;
    let archesVerts      = g_archesMesh.length / 3;
    let pythonVerts      = g_pythonMesh.length / 3;
    let terrainVerts     = g_terrainMesh.length / 3;
    let gridVerts        = g_gridMesh.length / 3;

    g_DRAGON_OFFSET        = 0;
    g_DRAGON_WING_L_OFFSET = g_DRAGON_OFFSET + dragonVerts;
    g_DRAGON_WING_R_OFFSET = g_DRAGON_WING_L_OFFSET + wingLVerts;
    g_ARCHES_OFFSET        = g_DRAGON_WING_R_OFFSET + wingRVerts;
    g_PYTHON_OFFSET        = g_ARCHES_OFFSET + archesVerts;
    g_TERRAIN_OFFSET       = g_PYTHON_OFFSET + pythonVerts;
    g_GRID_OFFSET          = g_TERRAIN_OFFSET + terrainVerts;

    // Get references to GLSL uniforms for each program

    // Shadow uniforms
    g_uShadowModel_ref      = gl.getUniformLocation(g_programShadow, 'u_Model');
    g_uShadowWorld_ref      = gl.getUniformLocation(g_programShadow, 'u_World');
    g_uShadowCamera_ref     = gl.getUniformLocation(g_programShadow, 'u_Camera');
    g_uShadowProjection_ref = gl.getUniformLocation(g_programShadow, 'u_Projective');

    // Lighting uniforms
    g_uLightModel_ref              = gl.getUniformLocation(g_programLighting, 'u_Model');
    g_uLightWorld_ref              = gl.getUniformLocation(g_programLighting, 'u_World');
    g_uLightCamera_ref             = gl.getUniformLocation(g_programLighting, 'u_Camera');
    g_uLightProjection_ref         = gl.getUniformLocation(g_programLighting, 'u_Projective');
    g_uLightModelWorldInvTrans_ref = gl.getUniformLocation(g_programLighting, 'u_ModelWorldInverseTranspose');
    g_uShadowTexture_ref           = gl.getUniformLocation(g_programLighting, 'u_ShadowTexture');
    g_uShadowTexelSize_ref         = gl.getUniformLocation(g_programLighting, 'u_ShadowTexelSize');
    g_uLightTransform_ref          = gl.getUniformLocation(g_programLighting, 'u_LightTransform');
    g_uLightPos_ref                = gl.getUniformLocation(g_programLighting, 'u_Light');
    g_uAmbientColor_ref            = gl.getUniformLocation(g_programLighting, 'u_AmbientColor');
    g_uDiffuseColor_ref            = gl.getUniformLocation(g_programLighting, 'u_DiffuseColor');
    g_uSpecPower_ref               = gl.getUniformLocation(g_programLighting, 'u_SpecPower');
    g_uSpecColor_ref               = gl.getUniformLocation(g_programLighting, 'u_SpecColor');
    g_uTexture_ref                 = gl.getUniformLocation(g_programLighting, 'u_Texture');
    g_uUseTexture_ref              = gl.getUniformLocation(g_programLighting, 'u_UseTexture');

    // Flat uniforms
    g_uFlatModel_ref      = gl.getUniformLocation(g_programFlat, 'u_Model');
    g_uFlatWorld_ref      = gl.getUniformLocation(g_programFlat, 'u_World');
    g_uFlatCamera_ref     = gl.getUniformLocation(g_programFlat, 'u_Camera');
    g_uFlatProjection_ref = gl.getUniformLocation(g_programFlat, 'u_Projection');
    g_uFlatColor_ref      = gl.getUniformLocation(g_programFlat, 'u_Color');

    // Setup our model positioning
    // Dragon: slightly smaller, positioned inside arches, with a slight inward tilt
    g_dragonBaseMatrix = new Matrix4()
        .scale(.12, .12, .12)                   // a little smaller than .15
        .rotate(180, 0, 1, 0)                   // face toward camera
        .translate(0, 1, 0.8)                   // radius/height of orbit
        .rotate(-15, 1, 0, 0);                  // tilt slightly toward center
    g_dragonMatrix      = new Matrix4(g_dragonBaseMatrix);
    g_dragonWingLMatrix = new Matrix4();
    g_dragonWingRMatrix = new Matrix4();
    // Make arches a bit bigger
    g_archesMatrix      = new Matrix4().scale(.6, .6, .6);
    // Python centered in the arches
    g_pythonBaseMatrix  = new Matrix4().scale(.05, .05, .05);
    g_pythonMatrix      = new Matrix4(g_pythonBaseMatrix);
    g_pythonSliderZ     = 0.0;
    g_terrainMatrix     = new Matrix4().translate(-options.width / 2, -options.height * 0, -options.depth / 2).scale(.5, .5, .5);

    // Place our model in the world (identity)
    g_worldMatrix = new Matrix4();

    // Initialize camera globals
    g_cameraHeight = 0.1;
    g_cameraYaw    = 0.0;
    g_cameraPitch  = 0.0;  

    g_cameraPos     = new Vector3(0.5, 0.1, 0.0); 
    g_cameraForward = new Vector3(0, 0, -1);
    g_cameraRight   = new Vector3(1, 0,  0);
    g_cameraUp      = new Vector3(0, 1,  0); 

    // Get the perspective projection
    g_projectionMatrix = new Matrix4().setPerspective(90, 1.0, .1, 50);

    // Shadow projection (orthographic from the light's perspective)
    g_shadowProjectionMatrix = new Matrix4().setOrtho(-50, 50, -50, 50, -50, 50);

    // Create dragon texture
    g_dragonTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_dragonTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, g_dragonImage);
    gl.generateMipmap(gl.TEXTURE_2D);

    // Create python texture
    g_pythonTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, g_pythonTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, g_pythonImage);
    gl.generateMipmap(gl.TEXTURE_2D);

    // ---------- Shadow framebuffer setup ----------
    g_shadowTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, g_shadowTexture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);

    g_framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, g_framebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D, g_shadowTexture, 0
    );

    let depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(
        gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
        SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT
    );
    gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER, depthBuffer
    );

    // Unbind framebuffer for now
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Enable culling and depth tests as usual
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Setup for ticks
    g_lastFrameMS = Date.now();

    // Setup light position and specular power (X = 5.0, Y = 15.0 on load)
    g_lightPosition = new Vector3([5.0, 15.0, 3.0]);
    g_specPower     = 64.0;

    // Start the render loop
    tick();
}

// Animation constants
const ROTATION_SPEED = 0.005;
const CAMERA_SPEED = .002;
const CAMERA_ROTATION_SPEED = .2;
const MAX_PITCH = 89.0;

// Independent dragon orbit speed (degrees per ms)
const DRAGON_ORBIT_SPEED = 0.03;

// Wing flap parameters (slower, smaller motion)
const WING_FLAP_MAX_ANGLE = 8.0;    // degrees of flap amplitude
const WING_FLAP_SPEED     = 0.004;  // smaller => slower flap

// Python S-curve slither parameters (per-section yaw)
const PYTHON_SLITHER_AMP_DEG      = 0.6;       // visible but not crazy
const PYTHON_SLITHER_SPEED        = 0.0014;    // how fast the S wiggles
const PYTHON_SLITHER_TOTAL_PHASE  = Math.PI/3;   // half-wave head→tail for a nice S

// function to apply all the logic for a single frame tick
function tick() {
    // Calculate time since the last frame
    let currentTime = Date.now();
    let deltaMS = currentTime - g_lastFrameMS;
    g_lastFrameMS = currentTime;

    // Rotatation angle for this frame (used for arches)
    const angle = ROTATION_SPEED * deltaMS;

    // Wing flap animation
    const baseSpread = -3.5;  // minimum outward angle; increase if you want them further from the body

    // Turn sin() from [-1, 1] into [0, 1] so we NEVER flap inward past baseSpread
    const flapT     = (Math.sin(currentTime * WING_FLAP_SPEED) + 1.0) * 0.5; // 0..1
    const flapDelta = WING_FLAP_MAX_ANGLE * flapT;                            // 0..WING_FLAP_MAX_ANGLE

    // Update wing matrices (rotate around their pivots in object space)
    if (g_wingLPivot && g_wingRPivot) {
        // Left wing: base spread + extra opening
        g_dragonWingLMatrix = new Matrix4();
        g_dragonWingLMatrix.translate(
            g_wingLPivot.elements[0],
            g_wingLPivot.elements[1],
            g_wingLPivot.elements[2]
        );
        g_dragonWingLMatrix.rotate(baseSpread + flapDelta, 0, 0, 1); // roll + flap
        g_dragonWingLMatrix.translate(
            -g_wingLPivot.elements[0],
            -g_wingLPivot.elements[1],
            -g_wingLPivot.elements[2]
        );

        // Right wing: mirrored base spread and flap
        g_dragonWingRMatrix = new Matrix4();
        g_dragonWingRMatrix.translate(
            g_wingRPivot.elements[0],
            g_wingRPivot.elements[1],
            g_wingRPivot.elements[2]
        );
        g_dragonWingRMatrix.rotate(-baseSpread - flapDelta, 0, 0, 1);
        g_dragonWingRMatrix.translate(
            -g_wingRPivot.elements[0],
            -g_wingRPivot.elements[1],
            -g_wingRPivot.elements[2]
        );
    }

    // Rotate arches around the center axis (keep the arches motion you had)
    g_archesMatrix.rotate(angle, 0, 1, 0);

    // --- Dragon orbit around the interior of the arches ---
    const dragonOrbitDelta = DRAGON_ORBIT_SPEED * deltaMS; 
    g_dragonOrbitAngle += dragonOrbitDelta;
    if (g_dragonOrbitAngle > 360.0) {
        g_dragonOrbitAngle -= 360.0;
    }

    // Orbit transform: rotate around Y, then apply base pose (scale/translate/tilt)
    let orbitMatrix = new Matrix4().setRotate(g_dragonOrbitAngle, 0, 1, 0);
    g_dragonMatrix = new Matrix4(orbitMatrix).multiply(g_dragonBaseMatrix);

    // --- Python S-curve slither along its body while moving in Z ---
    // Base transform: place the whole snake according to slider
    let basePython = new Matrix4(g_pythonBaseMatrix);
    basePython.translate(0, 0, g_pythonSliderZ);

    // time parameter for the wave
    let t = currentTime * PYTHON_SLITHER_SPEED;

    g_pythonSectionMatrices = {};
    const order = g_pythonSpineOrder || PYTHON_SECTIONS;
    const N = order.length;
    let idx = 0;

    for (let name of order) {
        const info = g_pythonSectionInfo[name];
        if (!info) {
            idx++;
            continue;
        }

        const pivot = info.pivot;

        // alpha goes from 0 (head) to 1 (tail)
        const alpha = (N > 1) ? idx / (N - 1) : 0.0;

        // spatial phase centered around the middle → nice symmetric S
        const spatialPhase = (alpha - 0.5) * PYTHON_SLITHER_TOTAL_PHASE;

        // EVERY section (including the head) participates equally in the S-wave
        const angleDeg = PYTHON_SLITHER_AMP_DEG * Math.sin(t + spatialPhase);

        // build matrix: base -> to pivot -> yaw -> back from pivot
        let m = new Matrix4(basePython);
        m.translate(pivot.elements[0], pivot.elements[1], pivot.elements[2]);
        m.rotate(angleDeg, 0, 1, 0);
        m.translate(-pivot.elements[0], -pivot.elements[1], -pivot.elements[2]);

        g_pythonSectionMatrices[name] = m;
        idx++;
    }

    // Move the camera based on user input
    const rotAmt = CAMERA_ROTATION_SPEED * deltaMS; 
    const moveAmt = CAMERA_SPEED * deltaMS;

    if (g_keysPressed['ArrowLeft']) {
        g_cameraYaw += rotAmt;
    }
    if (g_keysPressed['ArrowRight']) {
        g_cameraYaw -= rotAmt; 
    }
    if (g_keysPressed['ArrowUp']) {
        g_cameraPitch += rotAmt;
    }
    if (g_keysPressed['ArrowDown']) {
        g_cameraPitch -= rotAmt;
    }

    // clamp pitch to avoid flipping
    if (g_cameraPitch >  MAX_PITCH)  g_cameraPitch =  MAX_PITCH;
    if (g_cameraPitch < -MAX_PITCH)  g_cameraPitch = -MAX_PITCH;

    // Recompute forward/right/up from yaw/pitch
    const yawRad   = g_cameraYaw * Math.PI / 180.0;
    const pitchRad = g_cameraPitch * Math.PI / 180.0;

    let f = new Vector3([
        Math.sin(yawRad) * Math.cos(pitchRad),
        Math.sin(pitchRad),
        Math.cos(yawRad) * Math.cos(pitchRad)
    ]);
    f.normalize();
    g_cameraForward = f;

    // world up
    const worldUp = new Vector3(0, 1, 0);

    // right = up × forward
    let r = worldUp.cross(g_cameraForward);
    r.normalize();
    g_cameraRight = r;

    // up = forward × right
    let u = g_cameraForward.cross(g_cameraRight);
    u.normalize();
    g_cameraUp = u;

    // WASD + RF movement
    if (g_keysPressed['w']) {
        g_cameraPos = g_cameraPos.add(g_cameraForward.scaled(moveAmt));
    }
    if (g_keysPressed['s']) {
        g_cameraPos = g_cameraPos.add(g_cameraForward.scaled(-moveAmt));
    }
    if (g_keysPressed['a']) {
        g_cameraPos = g_cameraPos.add(g_cameraRight.scaled(moveAmt));
    }
    if (g_keysPressed['d']) {
        g_cameraPos = g_cameraPos.add(g_cameraRight.scaled(-moveAmt));
    }
    if (g_keysPressed['r']) {
        g_cameraPos = g_cameraPos.add(g_cameraUp.scaled(moveAmt));
    }
    if (g_keysPressed['f']) {
        g_cameraPos = g_cameraPos.add(g_cameraUp.scaled(-moveAmt));
    }

    // Draw the frame
    draw();

    // Call tick next frame
    requestAnimationFrame(tick, g_canvas);
}

// draw to the screen on the next frame
// We'll be doing a 2-pass render: shadow map, then lit scene using the shadow
function draw() {
    // First pass: render from the light's point of view into the shadow map
    gl.bindFramebuffer(gl.FRAMEBUFFER, g_framebuffer);
    gl.viewport(0, 0, SHADOW_MAP_WIDTH, SHADOW_MAP_HEIGHT);
    drawShadowPass();

    // Second pass: render the full scene with lighting and shadows
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, g_canvas.width, g_canvas.height);
    drawScenePass();
}

// Shadow pass: only depth + position; no color or lighting
function drawShadowPass() {
    gl.useProgram(g_programShadow);

    // Shadow pass uses only positions
    setupVec(3, g_programShadow, 'a_Position', 0, 0);

    // Clear the canvas with a black background for the shadow map
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Light "camera"
    let lightViewMatrix = new Matrix4().setLookAt(
        g_lightPosition,
        new Vector3(0, 0, 0),
        new Vector3(0, 1, 0)
    );
    gl.uniformMatrix4fv(g_uShadowCamera_ref, false, lightViewMatrix.elements);
    gl.uniformMatrix4fv(g_uShadowProjection_ref, false, g_shadowProjectionMatrix.elements);

    // World matrix is mostly identity for your models
    gl.uniformMatrix4fv(g_uShadowWorld_ref, false, g_worldMatrix.elements);

    // Dragon body
    gl.uniformMatrix4fv(g_uShadowModel_ref, false, g_dragonMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, g_DRAGON_OFFSET, g_dragonMesh.length / 3);

    // Dragon wings (use dragonMatrix * wingMatrix)
    if (g_dragonWingLMesh.length > 0) {
        let wingLModel = new Matrix4();
        wingLModel.multiply(g_dragonMatrix);
        wingLModel.multiply(g_dragonWingLMatrix);
        gl.uniformMatrix4fv(g_uShadowModel_ref, false, wingLModel.elements);
        gl.drawArrays(gl.TRIANGLES, g_DRAGON_WING_L_OFFSET, g_dragonWingLMesh.length / 3);
    }

    if (g_dragonWingRMesh.length > 0) {
        let wingRModel = new Matrix4();
        wingRModel.multiply(g_dragonMatrix);
        wingRModel.multiply(g_dragonWingRMatrix);
        gl.uniformMatrix4fv(g_uShadowModel_ref, false, wingRModel.elements);
        gl.drawArrays(gl.TRIANGLES, g_DRAGON_WING_R_OFFSET, g_dragonWingRMesh.length / 3);
    }

    // Arches
    gl.uniformMatrix4fv(g_uShadowModel_ref, false, g_archesMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, g_ARCHES_OFFSET, g_archesMesh.length / 3);

    // Python: draw each section with its own S-curve matrix
    const shadowOrder = g_pythonSpineOrder || PYTHON_SECTIONS;
    for (let name of shadowOrder) {
        const info = g_pythonSectionInfo[name];
        const m    = g_pythonSectionMatrices[name];
        if (!info || !m) continue;

        gl.uniformMatrix4fv(g_uShadowModel_ref, false, m.elements);
        gl.drawArrays(
            gl.TRIANGLES,
            g_PYTHON_OFFSET + info.offset,
            info.count
        );
    }

    // Terrain
    gl.uniformMatrix4fv(g_uShadowModel_ref, false, g_terrainMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, g_TERRAIN_OFFSET, g_terrainMesh.length / 3);

    // (Grid usually doesn't cast shadows, so we skip it here.)
}

// Lighting pass: render the scene with the shadow map
function drawScenePass() {
    gl.useProgram(g_programLighting);

    // Attributes: position, normal, color, texcoord for lighting
    setupVec(3, g_programLighting, 'a_Position', 0, 0);
    setupVec(3, g_programLighting, 'a_Normal',   0, g_TOTAL_POSITION_FLOATS * FLOAT_SIZE);
    setupVec(3, g_programLighting, 'a_Color',    0, (g_TOTAL_POSITION_FLOATS + g_TOTAL_NORMAL_FLOATS) * FLOAT_SIZE);
    setupVec(2, g_programLighting, 'a_TexCoord', 0, (g_TOTAL_POSITION_FLOATS + g_TOTAL_NORMAL_FLOATS + g_TOTAL_COLOR_FLOATS) * FLOAT_SIZE);

    // Reset the canvas now that we are drawing the scene properly
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Bind shadow map to texture unit 2
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, g_shadowTexture);
    if (g_uShadowTexture_ref) {
        gl.uniform1i(g_uShadowTexture_ref, 2);
    }
    if (g_uShadowTexelSize_ref) {
        gl.uniform1f(g_uShadowTexelSize_ref, 1.0 / SHADOW_MAP_WIDTH);
    }

    // Light transform (light projection * view)
    let lightViewMatrix = new Matrix4().setLookAt(
        g_lightPosition,
        new Vector3(0, 0, 0),
        new Vector3(0, 1, 0)
    );
    let lightMatrix = new Matrix4(g_shadowProjectionMatrix).multiply(lightViewMatrix);
    if (g_uLightTransform_ref) {
        gl.uniformMatrix4fv(g_uLightTransform_ref, false, lightMatrix.elements);
    }

    // Setup our camera and projections for all our drawing
    let cameraMatrix = calculateCameraMatrix();
    gl.uniformMatrix4fv(g_uLightCamera_ref,     false, cameraMatrix.elements);
    gl.uniformMatrix4fv(g_uLightProjection_ref, false, g_projectionMatrix.elements);

    // setup our light source position
    if (g_uLightPos_ref) {
        gl.uniform3fv(g_uLightPos_ref, g_lightPosition.elements);
    }

    // For all objects, the world matrix is g_worldMatrix, except when we alter it
    gl.uniformMatrix4fv(g_uLightWorld_ref, false, g_worldMatrix.elements);

    // ---- Dragon body (textured + lit) ----
    gl.uniformMatrix4fv(g_uLightModel_ref, false, g_dragonMatrix.elements);
    setMaterial(
        [0.05, 0.05, 0.05],   // ambient
        [0.8,  0.7,  0.9],    // diffuse
        [1.0,  1.0,  1.0],    // spec
        g_specPower
    );
    setModelWorldInverseTranspose(g_dragonMatrix, g_worldMatrix);

    if (g_uUseTexture_ref && g_uTexture_ref) {
        gl.uniform1i(g_uUseTexture_ref, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, g_dragonTexture);
        gl.uniform1i(g_uTexture_ref, 0);
    }

    gl.drawArrays(gl.TRIANGLES, g_DRAGON_OFFSET, g_dragonMesh.length / 3);

    // ---- Dragon wings (textured + lit, same material as body) ----
    if (g_dragonWingLMesh.length > 0) {
        let wingLModel = new Matrix4();
        wingLModel.multiply(g_dragonMatrix);
        wingLModel.multiply(g_dragonWingLMatrix);
        gl.uniformMatrix4fv(g_uLightModel_ref, false, wingLModel.elements);
        setModelWorldInverseTranspose(wingLModel, g_worldMatrix);

        if (g_uUseTexture_ref && g_uTexture_ref) {
            gl.uniform1i(g_uUseTexture_ref, 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, g_dragonTexture);
            gl.uniform1i(g_uTexture_ref, 0);
        }

        gl.drawArrays(gl.TRIANGLES, g_DRAGON_WING_L_OFFSET, g_dragonWingLMesh.length / 3);
    }

    if (g_dragonWingRMesh.length > 0) {
        let wingRModel = new Matrix4();
        wingRModel.multiply(g_dragonMatrix);
        wingRModel.multiply(g_dragonWingRMatrix);
        gl.uniformMatrix4fv(g_uLightModel_ref, false, wingRModel.elements);
        setModelWorldInverseTranspose(wingRModel, g_worldMatrix);

        if (g_uUseTexture_ref && g_uTexture_ref) {
            gl.uniform1i(g_uUseTexture_ref, 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, g_dragonTexture);
            gl.uniform1i(g_uTexture_ref, 0);
        }

        gl.drawArrays(gl.TRIANGLES, g_DRAGON_WING_R_OFFSET, g_dragonWingRMesh.length / 3);
    }

    // ---- Arches (colored, lit) ----
    gl.uniformMatrix4fv(g_uLightModel_ref, false, g_archesMatrix.elements);
    setMaterial(
        [0.05, 0.05, 0.05],
        [0.4,  0.5,  0.9],
        [0.9,  0.9,  0.9],
        32.0
    );
    setModelWorldInverseTranspose(g_archesMatrix, g_worldMatrix);
    if (g_uUseTexture_ref) {
        gl.uniform1i(g_uUseTexture_ref, 0);
    }
    gl.drawArrays(gl.TRIANGLES, g_ARCHES_OFFSET, g_archesMesh.length / 3);

    // ---- Python (textured, lit, S-curve slither) ----
    setMaterial(
        [0.05, 0.05, 0.05],
        [0.8,  0.8,  0.8],
        [1.0,  1.0,  1.0],
        g_specPower
    );

    if (g_uUseTexture_ref && g_uTexture_ref) {
        gl.uniform1i(g_uUseTexture_ref, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, g_pythonTexture);
        gl.uniform1i(g_uTexture_ref, 1);
    }

    const drawOrder = g_pythonSpineOrder || PYTHON_SECTIONS;
    for (let name of drawOrder) {
        const info = g_pythonSectionInfo[name];
        const m    = g_pythonSectionMatrices[name];
        if (!info || !m) continue;

        gl.uniformMatrix4fv(g_uLightModel_ref, false, m.elements);
        setModelWorldInverseTranspose(m, g_worldMatrix);

        gl.drawArrays(
            gl.TRIANGLES,
            g_PYTHON_OFFSET + info.offset,
            info.count
        );
    }

    // ---- Terrain (colored, lit) ----
    gl.uniformMatrix4fv(g_uLightModel_ref, false, g_terrainMatrix.elements);
    setMaterial(
        [0.1,  0.1,  0.1],
        [0.2,  0.2,  0.8],
        [0.2,  0.2,  0.3],
        16.0
    );
    setModelWorldInverseTranspose(g_terrainMatrix, g_worldMatrix);
    if (g_uUseTexture_ref) {
        gl.uniform1i(g_uUseTexture_ref, 0);
    }
    gl.drawArrays(gl.TRIANGLES, g_TERRAIN_OFFSET, g_terrainMesh.length / 3);

    // ---- Grid (drawn with flat shader) ----
    gl.useProgram(g_programFlat);
    setupVec(3, g_programFlat, 'a_Position', 0, 0);

    let flatCamera = cameraMatrix;
    gl.uniformMatrix4fv(g_uFlatCamera_ref,     false, flatCamera.elements);
    gl.uniformMatrix4fv(g_uFlatProjection_ref, false, g_projectionMatrix.elements);

    // World matrix for the grid: translate it slightly downward
    let gridWorld = new Matrix4().translate(0, -0.5, 0.0);
    gl.uniformMatrix4fv(g_uFlatWorld_ref, false, gridWorld.elements);
    gl.uniformMatrix4fv(g_uFlatModel_ref, false, new Matrix4().elements);
    gl.uniform3fv(g_uFlatColor_ref, new Float32Array([0, 1, 0]));

    // Draw the grid as lines
    // gl.drawArrays(gl.LINES, g_GRID_OFFSET, g_gridMesh.length / 3);
}

/**
 * Helper: set material uniforms for the lighting shader
 */
function setMaterial(ambient, diffuse, specular, specPower) {
    if (g_uAmbientColor_ref) gl.uniform3fv(g_uAmbientColor_ref, new Float32Array(ambient));
    if (g_uDiffuseColor_ref) gl.uniform3fv(g_uDiffuseColor_ref, new Float32Array(diffuse));
    if (g_uSpecColor_ref)    gl.uniform3fv(g_uSpecColor_ref,    new Float32Array(specular));
    if (g_uSpecPower_ref)    gl.uniform1f(g_uSpecPower_ref, specPower);
}

/**
 * Helper: compute and upload ModelWorldInverseTranspose matrix
 */
function setModelWorldInverseTranspose(modelMatrix, worldMatrix) {
    if (!g_uLightModelWorldInvTrans_ref) return;
    // modelWorld = world * model
    let mw = new Matrix4(worldMatrix).multiply(modelMatrix);
    // invert and transpose
    mw.invert();
    mw.transpose();
    gl.uniformMatrix4fv(g_uLightModelWorldInvTrans_ref, false, mw.elements);
}

/**
 * Helper function to compute the camera matrix (free camera)
 */
function calculateCameraMatrix() {
    return new Matrix4().setLookAt(
        g_cameraPos, 
        g_cameraPos.add(g_cameraForward),
        g_cameraUp
    );
}

// Helper function for python movement slider
function updatePythonPos(amount) {
    let label = document.getElementById('PythonPos');
    if (label) {
        label.textContent = `PythonPos: ${Number(amount)}`;
    }
    
    const z = Math.max(-0.25, Math.min(0.25, Number(amount))); // limit z to [-0.25, 0.25]
    // Store the slider offset; actual matrices are rebuilt each tick
    g_pythonSliderZ = -z;
}

/**
 * Helper function to setup key binding logic
 */
function setupKeyBinds() {
    // Setup the dictionary of keys we're tracking
    KEYS_TO_TRACK.forEach(key => {
        g_keysPressed[key] = false;
    });

    // Set key flag to true when key starts being pressed
    document.addEventListener('keydown', function (event) {
        KEYS_TO_TRACK.forEach(key => {
            if (event.key === key) {
                g_keysPressed[key] = true;
            }
        });
    });

    // Set key flag to false when key starts being pressed
    document.addEventListener('keyup', function (event) {
        KEYS_TO_TRACK.forEach(key => {
            if (event.key === key) {
                g_keysPressed[key] = false;
            }
        });
    });
}

/*
 * Helper to build a grid mesh and colors
 * Returns these results as a pair of arrays
 * Each vertex in the mesh is constructed with an associated grid_color
 */
function buildGridAttributes(grid_row_spacing, grid_column_spacing, grid_color) {
    let mesh = [];
    let colors = [];

    // Construct the rows
    for (let x = -GRID_X_RANGE; x < GRID_X_RANGE; x += grid_row_spacing) {
        // two vertices for each line
        // one at -Z and one at +Z
        mesh.push(x, 0, -GRID_Z_RANGE);
        mesh.push(x, 0, GRID_Z_RANGE);
    }

    // Construct the columns extending "outward" from the camera
    for (let z = -GRID_Z_RANGE; z < GRID_Z_RANGE; z += grid_column_spacing) {
        // two vertices for each line
        // one at -Z and one at +Z
        mesh.push(-GRID_X_RANGE, 0, z);
        mesh.push(GRID_X_RANGE, 0, z);
    }

    // We need one color per vertex
    // since we have 3 components for each vertex, this is length/3
    for (let i = 0; i < mesh.length / 3; i++) {
        colors.push(grid_color[0], grid_color[1], grid_color[2]);
    }

    return [mesh, colors];
}

/*
 * Helper to construct colors to make meshes look more 3D
 * Makes every triangle a slightly different shade of blue
 * @param {int} vertexCount how many vertices to build colors for
 * @returns {Array<float>} a flat array of colors
 */
function buildColorAttributes(vertexCount) {
    let colors = [];

    // for every triangle in the model
    for (let i = 0; i < vertexCount / 3; i++) {
        // three vertices per triangle
        for (let vert = 0; vert < 3; vert++) {
            // construct a grayscale RGB color
            // we use i so each triangle gets a slightly different color
            // but since it's RGB it will always be some kind of shade of blue
            let shade = (i * 3) / vertexCount;
            colors.push(shade, shade, 1.0);
        }
    }

    return colors;
}

/*
 * Builds some "random-ish" per-vertex colors for the python so it's not monotone
 */
function buildPerVertexColorAttributes(vertexCount) {
    let colors = [];
    for (let i = 0; i < vertexCount / 3; i++) {
        // three vertices per triangle
        for (let vert = 0; vert < 3; vert++) {
            let shade = (i * 3) / vertexCount;
            colors.push(shade * vert, shade * 3 * vert, 0.5);
        }
    }
    return colors;
}

/*
 * Returns dummy texture coordinates (0,0) for every vertex
 */
function makeDummyTexCoords(vertexCount) {
    const textCoords = [];
    for (let i = 0; i < vertexCount; i++) {
        textCoords.push(0.0, 0.0);
    }
    return textCoords;
}

/**
 * Simple helper to create upward normals (0,1,0) for each vertex
 */
function makeUpNormals(vertexCount) {
    const normals = [];
    for (let i = 0; i < vertexCount; i++) {
        normals.push(0.0, 1.0, 0.0);
    }
    return normals;
}

/*
 * Helper to construct _basic_ per-vertex terrain colors
 * We use the height of the terrain to select a color between white and blue
 * Requires that we pass in the height of the terrain (as a number), but feel free to change this
 */
function buildTerrainColors(terrain, height) {
    let colors = [];
    for (let i = 0; i < terrain.length; i++) {
        // calculates the vertex color for each vertex independent of the triangle
        // the rasterizer can help make this look "smooth"

        // we use the y axis of each vertex alone for color
        // higher "peaks" have more shade
        let shade = (terrain[i][1] / height) + 0.5;
        let color = [shade, shade, 1.0];

        // give each triangle 3 colors
        colors.push(...color);
    }

    return colors;
}

/**
 * Compute the centroid of a flat mesh array [x0,y0,z0,x1,y1,z1,...]
 * (kept in case you need it elsewhere)
 */
function computeMeshCentroid(mesh) {
    if (!mesh || mesh.length === 0) {
        return new Vector3([0, 0, 0]);
    }
    let cx = 0, cy = 0, cz = 0;
    const count = mesh.length / 3;
    for (let i = 0; i < mesh.length; i += 3) {
        cx += mesh[i];
        cy += mesh[i + 1];
        cz += mesh[i + 2];
    }
    return new Vector3([cx / count, cy / count, cz / count]);
}

/**
 * Compute a better wing pivot based on the wing's bounding box:
 * - X: choose the side of the wing closer to x = 0 (toward the body)
 * - Y/Z: center of the wing in Y and Z
 */
function computeWingPivot(mesh) {
    if (!mesh || mesh.length === 0) {
        return new Vector3([0, 0, 0]);
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < mesh.length; i += 3) {
        const x = mesh[i];
        const y = mesh[i + 1];
        const z = mesh[i + 2];

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;

        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }

    // Pick the X closer to the body plane (x ~ 0)
    let pivotX = (Math.abs(minX) < Math.abs(maxX)) ? minX : maxX;
    let pivotY = (minY + maxY) * 0.5;
    let pivotZ = (minZ + maxZ) * 0.5;

    return new Vector3([pivotX, pivotY, pivotZ]);
}

/**
 * Compute and store python spine order based on section pivot positions.
 * Chooses the axis with the largest extent and sorts along that axis.
 */
function buildPythonSpineOrder() {
    const names = Object.keys(g_pythonSectionInfo);
    if (!names.length) {
        g_pythonSpineOrder = null;
        return;
    }

    // Compute min/max on each axis
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let name of names) {
        const p = g_pythonSectionInfo[name].pivot.elements;
        const x = p[0], y = p[1], z = p[2];

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;

    // Choose axis with largest range as "spine" axis
    let axisIndex = 0;
    if (rangeY >= rangeX && rangeY >= rangeZ) {
        axisIndex = 1;
    } else if (rangeZ >= rangeX && rangeZ >= rangeY) {
        axisIndex = 2;
    } else {
        axisIndex = 0;
    }

    let sorted = names.slice().sort((a, b) => {
        const pa = g_pythonSectionInfo[a].pivot.elements[axisIndex];
        const pb = g_pythonSectionInfo[b].pivot.elements[axisIndex];
        return pa - pb;
    });

    // Rotate list so 'Head' is first if present
    const headIndex = sorted.indexOf('Head');
    if (headIndex > 0) {
        sorted = sorted.slice(headIndex).concat(sorted.slice(0, headIndex));
    }

    g_pythonSpineOrder = sorted;

    console.log('Python spine order:', g_pythonSpineOrder.map(
        n => ({ name: n, pivot: g_pythonSectionInfo[n].pivot.elements })
    ));
}

/**
 * Initialize the VBO with the provided data
 * Assumes we are going to have "static" (unchanging) data
 * @param {Float32Array} data 
 * @return {Boolean} true if the VBO was setup successfully, and false otherwise
 */
function initVBO(data) {
    // get the VBO handle
    let VBOloc = gl.createBuffer();
    if (!VBOloc) {
        console.error('Failed to create the vertex buffer object');
        return false;
    }

    // Bind the VBO to the GPU array and copy `data` into that VBO
    gl.bindBuffer(gl.ARRAY_BUFFER, VBOloc);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    return true;
}

/**
 * Specifies properties of the given attribute on the GPU
 * @param {Number} length : the length of the vector (e.g. 3 for a Vector3);
 * @param {WebGLProgram} program : which program to attach the attribute to
 * @param {String} name : the name of the attribute in GLSL
 * @param {Number} stride : the stride in bytes
 * @param {Number} offset : the offset in bytes
 * @return {Boolean} true if the attribute was setup successfully, and false otherwise
 */
function setupVec(length, program, name, stride, offset) {
    // Get the attribute by name
    let attributeID = gl.getAttribLocation(program, `${name}`);
    if (attributeID < 0) {
        // Not all programs use all attributes (e.g., shadow program has no a_TexCoord)
        // This is not necessarily an error, so just return true.
        return true;
    }

    // Set how the GPU fills the attribute variable with data from the VBO 
    gl.vertexAttribPointer(attributeID, length, gl.FLOAT, false, stride, offset);
    gl.enableVertexAttribArray(attributeID);

    return true;
}
