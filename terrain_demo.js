// Last edited by Dietrich Geisler 2025

// Global reference to the webGL context, canvas, and shaders
let g_canvas;
let gl;
let g_vshader;
let g_fshader;

// Global to keep track of the time of the _previous_ frame
let g_lastFrameMS = 0;

// Globals to track if the given list of keys are pressed
let g_keysPressed = {};
const KEYS_TO_TRACK = ['w', 'a', 's', 'd', 'r', 'f'];

// GLSL uniform references
let g_uModel_ref;
let g_uWorld_ref;
let g_uCamera_ref;
let g_uProjection_ref;

// Usual Matrices
let g_terrainModelMatrix;
let g_terrainWorldMatrix;
let g_projectionMatrix;

// Keep track of the camera position, always looking at the center of the world
let g_cameraDistance;
let g_cameraAngle;
let g_cameraHeight;

// Terrain Mesh definition
let g_terrainMesh;

// The size in bytes of a floating point
const FLOAT_SIZE = 4;

function main() {
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
    loadGLSLFiles();
}

/*
 * Helper function to load our GLSL files for compiling in sequence
 */
async function loadGLSLFiles() {
    g_vshader = await fetch('./flat_color.vert').then(response => response.text()).then((x) => x);
    g_fshader = await fetch('./flat_color.frag').then(response => response.text()).then((x) => x);

    // wait until everything is loaded before rendering
    startRendering();
}

function startRendering() {
    // Initialize GPU's vertex and fragment shaders programs
    if (!initShaders(gl, g_vshader, g_fshader)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    // class for building the terrain mesh
    let terrainGenerator = new TerrainGenerator();
    // use the current milliseconds as our seed by default
    // TODO: consider setting this as a constant when testing stuff!
    let seed = new Date().getMilliseconds();

    // Setup the options for our terrain generation
    // TODO: try messing around with these options!  
    //   noisefn and roughness in particular give some interesting results when changed
    let options = { 
        width: 100, // initial = 100 
        height: 5, // initial = 10
        depth: 100, // initial = 100
        seed: seed, // initial = seed
        noisefn: "perlin", // Options include "simplex", "wave", and "perlin"
        roughness: 20 // initial = 20
    };

    // construct a terrain mesh of an array of 3-vectors
    // TODO: integrate this with your code!
    let terrain = terrainGenerator.generateTerrainMesh(options);

    // give basic height-based colors based on the 3-vertex specified terrain
    // TODO: make this more interesting (see the function itself)
    let terrainColors = buildTerrainColors(terrain, options.height);

    // "flatten" the terrain above to construct our usual global mesh
    g_terrainMesh = []
    for (let i = 0; i < terrain.length; i++) {
        g_terrainMesh.push(...terrain[i])
    }

    // put the terrain and colors into the VBO
    let data = g_terrainMesh.concat(terrainColors);
    if (!initVBO(new Float32Array(data))) {
        return;
    }

    // Communicate our data layout to the GPU
    if (!setupVec(3, 'a_Position', 0, 0)) {
        return;
    }
    if (!setupVec(3, 'a_Color', 0, g_terrainMesh.length * FLOAT_SIZE)) {
        return;
    }

    // Get references to GLSL uniforms
    g_uModel_ref = gl.getUniformLocation(gl.program, 'u_Model');
    g_uWorld_ref = gl.getUniformLocation(gl.program, 'u_World');
    g_uCamera_ref = gl.getUniformLocation(gl.program, 'u_Camera');
    g_uProjection_ref = gl.getUniformLocation(gl.program, 'u_Projection');

    // Setup a model and world matrix for our terrain
    // Position can be given by our width/height, 
    //   noting that we are centered initially at the "midpoint"
    // We want to be a bit above the terrain initially so we can see it
    // TODO: resize the terrain as needed to "fit" with your animation
    g_terrainModelMatrix = new Matrix4();
    // move in view of the initial camera
    // TODO: you may want to move your terrain!  This is just placed for the demo
    g_terrainWorldMatrix = new Matrix4().translate(-options.width / 2, -options.height, -options.depth / 2);

    // Place the camera above our terrain
    g_cameraDistance = 5.0;
    g_cameraHeight = 3.0;
    g_cameraAngle = 0.0;

    // Setup a reasonable "basic" perspective projection
    g_projectionMatrix = new Matrix4().setPerspective(90, 1, .1, 1000);

    // Enable culling and depth
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Setup for ticks
    g_lastFrameMS = Date.now();

    tick();
}

// Animation constants
const CAMERA_SPEED = .003;
const CAMERA_ROTATION_SPEED = .1;
const CAMERA_ZOOM_SPEED = .05;

// function to apply all the logic for a single frame tick
function tick() {
    // Calculate time since the last frame
    let currentTime = Date.now();
    let deltaMS = currentTime - g_lastFrameMS;
    g_lastFrameMS = currentTime;

    updateCameraPosition(deltaMS);

    draw()

    requestAnimationFrame(tick, g_canvas)
}

// draw to the screen on the next frame
function draw() {
    // Clear the canvas with a black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update the camera and projection matrices
    let cameraMatrix = calculateCameraMatrix();
    gl.uniformMatrix4fv(g_uCamera_ref, false, cameraMatrix.elements);
    gl.uniformMatrix4fv(g_uProjection_ref, false, g_projectionMatrix.elements);

    // Update with our terrain transformation matrices
    gl.uniformMatrix4fv(g_uModel_ref, false, g_terrainModelMatrix.elements);
    gl.uniformMatrix4fv(g_uWorld_ref, false, g_terrainWorldMatrix.elements);

    // Draw the terrain
    gl.drawArrays(gl.TRIANGLES, 0, g_terrainMesh.length / 3);
}

/*
 * Helper function to update the camera position each frame
 */
function updateCameraPosition(deltaMS) {
    // Move the camera based on user input
    if (g_keysPressed['r']) {
        g_cameraHeight += CAMERA_SPEED * deltaMS;
    }
    if (g_keysPressed['f']) {
        g_cameraHeight -= CAMERA_SPEED * deltaMS;
    }
    if (g_keysPressed['a']) {
        g_cameraAngle -= CAMERA_ROTATION_SPEED * deltaMS;
    }
    if (g_keysPressed['d']) {
        g_cameraAngle += CAMERA_ROTATION_SPEED * deltaMS;
    }
    if (g_keysPressed['w']) {
        // note that moving "forward" means "towards the model"
        g_cameraDistance -= CAMERA_ZOOM_SPEED * deltaMS;
        // we don't want to hit a distance of 0
        g_cameraDistance = Math.max(g_cameraDistance, 0.1);
    }
    if (g_keysPressed['s']) {
        g_cameraDistance += CAMERA_ZOOM_SPEED * deltaMS;
    }
}

/*
 * Helper to construct _basic_ per-vertex terrain colors
 * We use the height of the terrain to select a color between white and blue
 * Requires that we pass in the height of the terrain (as a number), but feel free to change this
 * TODO: you should expect to modify this helper with custom (or more interesting) colors
 */
function buildTerrainColors(terrain, height) {
    let colors = []
    for (let i = 0; i < terrain.length; i++) {
        // calculates the vertex color for each vertex independent of the triangle
        // the rasterizer can help make this look "smooth"

        // we use the y axis of each vertex alone for color
        // higher "peaks" have more shade
        let shade = (terrain[i][1] / height) + 1/2
        let color = [shade, shade, 1.0]

        // give each triangle 3 colors
        colors.push(...color)
    }

    return colors
}

/**
 * Helper function to split out the camera math
 * You may want to modify this to have a free-moving camera
 */
function calculateCameraMatrix() {
    // Calculate the camera position from our angle and height
    // we get to use a bit of clever 2D rotation math
    // note that we can only do this because we're "fixing" our plane of motion
    // if we wanted to allow arbitrary rotation, we may also want quaternions
    camX = Math.sin(Math.PI * g_cameraAngle / 180);
    camY = g_cameraHeight;
    camZ = Math.cos(Math.PI * g_cameraAngle / 180);

    // Calculate the camera position based on distance
    let cameraPosition = new Vector3([camX, camY, camZ]);
    cameraPosition.normalize();
    cameraPosition = cameraPosition.scaled(g_cameraDistance);

    // Look at the center of the world from our current distance
    return new Matrix4().setLookAt(
        cameraPosition,
        new Vector3([0, 0, 0]),
        new Vector3([0, 1, 0])
    );
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
            if (event.key == key) {
                g_keysPressed[key] = true;
            }
        });
    })

    // Set key flag to false when key starts being pressed
    document.addEventListener('keyup', function (event) {
        KEYS_TO_TRACK.forEach(key => {
            if (event.key == key) {
                g_keysPressed[key] = false;
            }
        });
    })
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
 * @param {String} name : the name of the attribute in GLSL
 * @param {Number} stride : the stride in bytes
 * @param {Number} offset : the offset in bytes
 * @return {Boolean} true if the attribute was setup successfully, and false otherwise
 */
function setupVec(length, name, stride, offset) {
    // Get the attribute by name
    let attributeID = gl.getAttribLocation(gl.program, `${name}`);
    if (attributeID < 0) {
        console.error(`Failed to get the storage location of ${name}`);
        return false;
    }

    // Set how the GPU fills the a_Position letiable with data from the GPU 
    gl.vertexAttribPointer(attributeID, length, gl.FLOAT, false, stride, offset);
    gl.enableVertexAttribArray(attributeID);

    return true;
}