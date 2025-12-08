// Last edited by Jonathan Garcia de Paz 2025

// Global reference to the webGL context and the canvas
let g_canvas;
let gl;
let g_vshader;
let g_fshader;

// Global to keep track of the time of the _previous_ frame
let g_lastFrameMS = 0;

// Globals to track if the given list of keys are pressed
let g_keysPressed = {};
const KEYS_TO_TRACK = ['w', 'a', 's', 'd', 'r', 'f', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// GLSL uniform references
let g_uModel_ref;
let g_uWorld_ref;
let g_uCamera_ref;
let g_uProjection_ref;
let g_uTexture_ref;
let g_uUseTexture_ref;

// Matrices
let g_dragonHeadMatrix;
let g_dragonMatrix;
let g_archesMatrix;
let g_pythonBaseMatrix;
let g_pythonMatrix;
let g_terrainMatrix;
let g_projectionMatrix;
let g_worldMatrix;

// Object information (Mesh, Normals, and Texture Coordinates)
let g_dragonMesh;
let g_dragonHeadMesh;
let g_archesMesh;
let g_pythonMesh;
let g_terrainMesh;
let g_gridMesh;

let g_dragonNormals;
let g_dragonHeadNormals;
let g_archesNormals;
let g_pythonNormals;

let g_dragonTextureCoords;
let g_dragonHeadTextureCoords;
let g_archesTextureCoords;
let g_pythonTextureCoords;

// Texture Imgaes
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

// The size in bytes of a floating point
const FLOAT_SIZE = 4;

function main() {
    // Setup for slider
    slider_input = document.getElementById('sliderPython');
    slider_input.addEventListener('input', (event) => {
        updatePythonPos(event.target.value);
    });

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
    dragonData = await fetch('./resources/dragon_pose1.obj').then(response => response.text()).then((x) => x)
    archesData = await fetch('./resources/arches.obj').then(response => response.text()).then((x) => x)
    pythonData = await fetch('./resources/ballpython.obj').then(response => response.text()).then((x) => x)

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
    g_dragonHeadMesh = [];
    g_archesMesh = [];
    g_pythonMesh = [];

    g_dragonNormals = [];
    g_dragonHeadNormals = [];
    g_archesNormals = [];
    g_pythonNormals = [];

    g_dragonTextureCoords = [];
    g_dragonHeadTextureCoords = [];
    g_archesTextureCoords = [];
    g_pythonTextureCoords = [];

    // Read the obj meshes
    readObjFileByGroup(dragonData, dragonMesh, dragonNormals, dragonTextureCoords);
    readObjFileByGroup(archesData, archesMesh, archesNormals, archesTextureCoords);
    readObjFileByGroup(pythonData, pythonMesh, pythonNormals, pythonTextureCoords);
    
    // Creating the color arrays to send to the VBO
    dragonColors = [];
    dragonHeadColors = [];
    archesColors = [];
    pythonColors = [];


    // Loop through and allocate the parts to the proper meshes along with the colors
    for (let key in dragonMesh){
        if (key == ('head')){
            g_dragonHeadMesh = g_dragonHeadMesh.concat(dragonMesh[key]);
            dragonHeadColors = dragonHeadColors.concat(buildColorAttributes(dragonMesh[key].length/3));
            
            g_dragonHeadNormals = g_dragonHeadNormals.concat(dragonNormals[key]);
            g_dragonHeadTextureCoords = g_dragonHeadTextureCoords.concat(dragonTextureCoords[key]);
        }
        else{
            g_dragonMesh = g_dragonMesh.concat(dragonMesh[key]);
            dragonColors = dragonColors.concat(buildColorAttributes(dragonMesh[key].length/3));

            g_dragonNormals = g_dragonNormals.concat(dragonNormals[key]);
            g_dragonTextureCoords = g_dragonTextureCoords.concat(dragonTextureCoords[key]);
        }
    }
    for (let key in archesMesh){
        g_archesMesh = g_archesMesh.concat(archesMesh[key]);
        archesColors = archesColors.concat(buildColorAttributes(archesMesh[key].length/3));

        g_archesNormals = g_archesNormals.concat(archesNormals[key]);
        g_archesTextureCoords = g_archesTextureCoords.concat(archesTextureCoords[key]);
    }
    for (let key in pythonMesh){
        g_pythonMesh = g_pythonMesh.concat(pythonMesh[key]);
        pythonColors = pythonColors.concat(buildPerVertexColorAttributes(pythonMesh[key].length/3));

        g_pythonNormals = g_pythonNormals.concat(pythonNormals[key]);
        g_pythonTextureCoords = g_pythonTextureCoords.concat(pythonTextureCoords[key]);
    }

    // Start our first frame
    loadImageFiles();
}

/*
 * Helper function to _synchronously_ load image files
 * This can make you quite sad the first time loading an image...
 * But for this class it's "good enough"
 * Feel free to make this asynchronous of course
 */
async function loadImageFiles() {
    g_dragonImage = new Image();
    g_pythonImage = new Image();

    g_dragonImage.src = "resources/dragontexture1.png";
    g_pythonImage.src = "resources/ballpython_texture.png";

    await g_dragonImage.decode();
    await g_pythonImage.decode();
    
    loadGLSLFiles();
}

/*
 * Helper function to load our GLSL files for compiling in sequence
 */
async function loadGLSLFiles() {
    g_vshader = await fetch('./shader.vert').then(response => response.text()).then((x) => x);
    g_fshader = await fetch('./shader.frag').then(response => response.text()).then((x) => x);

    // wait until everything is loaded before rendering
    startRendering();
}

function startRendering() {
    // Initialize GPU's vertex and fragment shaders programs
    if (!initShaders(gl, g_vshader, g_fshader)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // build a grid model with colors
    [g_gridMesh, g_gridColors] = buildGridAttributes(1, 1, [0, 1, 0]);

    // class for building the terrain mesh
    let terrainGenerator = new TerrainGenerator();

    // constant seed
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
    g_terrainMesh = []
    for (let i = 0; i < terrain.length; i++) {
        g_terrainMesh.push(...terrain[i])
    }

    // Send our data to the GPU
    let data = g_dragonMesh.concat(g_dragonHeadMesh).concat(g_archesMesh).concat(g_pythonMesh).concat(g_terrainMesh).concat(g_gridMesh)
                .concat(dragonColors).concat(dragonHeadColors).concat(archesColors).concat(pythonColors).concat(terrainColors).concat(g_gridColors)
                .concat(g_dragonTextureCoords).concat(g_dragonHeadTextureCoords).concat(g_archesTextureCoords).concat(g_pythonTextureCoords).concat(makeDummyTexCoords(g_terrainMesh.length / 3)).concat(makeDummyTexCoords(g_gridMesh.length / 3));
    if (!initVBO(new Float32Array(data))) {
        return;
    }

    // Communicate our data layout to the GPU
    if (!setupVec(3, 'a_Position', 0, 0)) {
        return;
    }
    if (!setupVec(3, 'a_Color', 0, (g_dragonMesh.length + g_dragonHeadMesh.length + g_archesMesh.length + g_pythonMesh.length + g_terrainMesh.length + g_gridMesh.length) * FLOAT_SIZE)) {
        return;
    }
    if (!setupVec(2, 'a_TexCoord', 0, (g_dragonMesh.length + g_dragonHeadMesh.length + g_archesMesh.length + g_pythonMesh.length + g_terrainMesh.length + g_gridMesh.length 
                                        + dragonColors.length + dragonHeadColors.length + archesColors.length + pythonColors.length + terrainColors.length + g_gridColors.length) * FLOAT_SIZE)) {
        return;
    }

    // Get references to GLSL uniforms
    g_uModel_ref = gl.getUniformLocation(gl.program, 'u_Model');
    g_uWorld_ref = gl.getUniformLocation(gl.program, 'u_World');
    g_uCamera_ref = gl.getUniformLocation(gl.program, 'u_Camera');
    g_uProjection_ref = gl.getUniformLocation(gl.program, 'u_Projection');
    g_uTexture_ref = gl.getUniformLocation(gl.program, 'u_Texture');
    g_uUseTexture_ref = gl.getUniformLocation(gl.program, 'u_UseTexture');

    // Setup our model positioning
    g_dragonHeadMatrix = new Matrix4();
    g_dragonMatrix = new Matrix4().scale(.15, .15, .15).rotate(180, 0, 1, 0).translate(0, 0, 0.5);
    g_archesMatrix = new Matrix4().scale(.5, .5, .5);
    g_pythonBaseMatrix = new Matrix4().scale(.05, .05, .05);
    g_pythonMatrix = new Matrix4(g_pythonBaseMatrix);   
    g_terrainMatrix = new Matrix4().translate(-options.width / 2, -options.height * 0, -options.depth / 2).scale(.5, .5, .5);

    // Place our model in the world
    g_worldMatrix = new Matrix4();

    // Initialize camera globals
    g_cameraHeight = 0.1;
    g_cameraYaw = 0.0;
    g_cameraPitch = 0.0;  

    g_cameraPos = new Vector3(0.5, 0.1, 0.0); 
    g_cameraForward = new Vector3(0, 0, -1);
    g_cameraRight   = new Vector3(1, 0,  0);
    g_cameraUp      = new Vector3(0, 1,  0); 

    // Get the perspective projection
    g_projectionMatrix = new Matrix4().setPerspective(90, 1.0, .1, 50);

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

    // Enable culling and depth
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Setup for ticks
    g_lastFrameMS = Date.now();

    tick();
}

// Animation constants
const ROTATION_SPEED = 0.005;
const CAMERA_SPEED = .002;
const CAMERA_ROTATION_SPEED = .2;
const NECK_PIVOT = { x: 0, y: 0, z: 0 };
const MAX_PITCH = 89.0;

// function to apply all the logic for a single frame tick
function tick() {
    // Calculate time since the last frame
    let currentTime = Date.now();
    let deltaMS = currentTime - g_lastFrameMS;
    g_lastFrameMS = currentTime;

    // Rotatation angle for the arches
    const angle = ROTATION_SPEED * deltaMS;

    // Dragon angle per frame
    const dragonAngle = 5 * Math.sin(currentTime * 0.002);  // oscillates smoothly

    // Oscillates the dragon head to appear like it's shaking its head
    g_dragonHeadMatrix = new Matrix4();
    g_dragonHeadMatrix.translate(NECK_PIVOT.x, NECK_PIVOT.y, NECK_PIVOT.z);
    g_dragonHeadMatrix.rotate(dragonAngle, 0, 1, 0); // rotate around Y axis (yaw)
    g_dragonHeadMatrix.translate(-NECK_PIVOT.x, -NECK_PIVOT.y, -NECK_PIVOT.z);
    g_archesMatrix.rotate(angle, 0, 1, 0);

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

    if (g_cameraPitch >  MAX_PITCH)  g_cameraPitch =  MAX_PITCH;
    if (g_cameraPitch < -MAX_PITCH)  g_cameraPitch = -MAX_PITCH;


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

    draw();

    // Call tick next frame
    requestAnimationFrame(tick, g_canvas);
}

// draw to the screen on the next frame
function draw() {
    // Clear the canvas with a black background
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update the camera matrix each frame based on camera values
    // Note that everything will (usually) use the same camera matrix
    // So we can just put all that here
    let cameraMatrix = calculateCameraMatrix();
    gl.uniformMatrix4fv(g_uCamera_ref, false, cameraMatrix.elements);
    gl.uniformMatrix4fv(g_uProjection_ref, false, g_projectionMatrix.elements);

    // Update model transformations
    gl.uniformMatrix4fv(g_uWorld_ref, false, g_worldMatrix.elements);

    // Use the matrix and draw the dragon body mesh
    gl.uniformMatrix4fv(g_uModel_ref, false, g_dragonMatrix.elements);
    gl.uniform1i(g_uUseTexture_ref, 1); // use texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_dragonTexture);
    gl.uniform1i(g_uTexture_ref, 0);
    gl.drawArrays(gl.TRIANGLES, 0, g_dragonMesh.length / 3);

    // Perform the matrix multiplication for dragon
    let dragonMatrix = new Matrix4();
    dragonMatrix.multiply(g_dragonMatrix);
    dragonMatrix.multiply(g_dragonHeadMatrix);

    // Use the matrix and draw the dragon head mesh with texture
    gl.uniformMatrix4fv(g_uModel_ref, false, dragonMatrix.elements);
    gl.uniform1i(g_uUseTexture_ref, 1); // use texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_dragonTexture);
    gl.uniform1i(g_uTexture_ref, 0);
    gl.drawArrays(gl.TRIANGLES, g_dragonMesh.length / 3, g_dragonHeadMesh.length / 3);

    // Use the matrix and draw the arches mesh with color 
    gl.uniformMatrix4fv(g_uModel_ref, false, g_archesMatrix.elements);
    gl.uniform1i(g_uUseTexture_ref, 0); // use color
    gl.drawArrays(gl.TRIANGLES, (g_dragonMesh.length / 3 + g_dragonHeadMesh.length / 3), g_archesMesh.length / 3);

    // Use the matrix and draw the python mesh with texture
    gl.uniformMatrix4fv(g_uModel_ref, false, g_pythonMatrix.elements);
    gl.uniform1i(g_uUseTexture_ref, 1); // use texture
    gl.activeTexture(gl.TEXTURE1); 
    gl.bindTexture(gl.TEXTURE_2D, g_pythonTexture);
    gl.uniform1i(g_uTexture_ref, 1); 
    gl.drawArrays(gl.TRIANGLES, (g_dragonMesh.length / 3 + g_dragonHeadMesh.length / 3 + g_archesMesh.length / 3), g_pythonMesh.length / 3);

    // Use the matrix and draw the terrain mesh with color
    gl.uniformMatrix4fv(g_uModel_ref, false, g_terrainMatrix.elements);
    gl.uniform1i(g_uUseTexture_ref, 0); // use color
    gl.drawArrays(gl.TRIANGLES, (g_dragonMesh.length / 3 + g_dragonHeadMesh.length / 3 + g_archesMesh.length / 3 + g_pythonMesh.length / 3), g_terrainMesh.length / 3);

    // Draw the grid at the origin, translated down just a bit
    gl.uniformMatrix4fv(g_uModel_ref, false, new Matrix4().elements);
    gl.uniformMatrix4fv(g_uWorld_ref, false, new Matrix4().translate(0, -0.5, 0.0).elements);

    // Draw the grid
    // Note the use of gl.LINES that makes, well, lines rather than triangles
    // This is also why the grid can be stored as sets of 2-vertices
    // gl.uniform1i(g_uUseTexture_ref, 0);  // use vertex color
    // gl.drawArrays(gl.LINES, (g_dragonMesh.length / 3 + g_dragonHeadMesh.length / 3 + g_archesMesh.length / 3 + g_pythonMesh.length / 3 + g_terrainMesh.length / 3), g_gridMesh.length / 3);
}

/**
 * Helper function to split out the camera math
 * You may want to modify this to have a free-moving camera
 */
function calculateCameraMatrix() {
    return new Matrix4().setLookAt(
        g_cameraPos, 
        g_cameraPos.add(g_cameraForward),
        g_cameraUp
    );
}

// Helper function for python movement slider
function updatePythonPos(amount){
    let label = document.getElementById('PythonPos');
    label.textContent = `PythonPos: ${Number(amount)}`;
    
    const z = Math.max(-0.25, Math.min(0.25, Number(amount))); // limit z to [-0.25, 0.25]
    g_pythonMatrix = new Matrix4(g_pythonBaseMatrix).translate(0, 0, -z);
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

// Grid constants

// How far in the X and Z directions the grid should extend
// Recall that the camera "rests" on the X/Z plane, since Z is "out" from the camera
const GRID_X_RANGE = 1000;
const GRID_Z_RANGE = 1000;

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

/**
 * Helper to construct colors to make meshes look more 3D
 * Makes every triangle a slightly different shade of blue
 * @param {int} vertexCount how many vertices to build colors for
 * @returns {Array<float>} a flat array of colors
 */
function buildColorAttributes(vertexCount) {
    let colors = [];
    for (let i = 0; i < vertexCount / 3; i++) {
        // three vertices per triangle
        for (let vert = 0; vert < 3; vert++) {
            let shade = (i * 3) / vertexCount;
            colors.push(shade, shade, 1.0);
        }
    }
    return colors;
}

function buildPerVertexColorAttributes(vertexCount) {
    let colors = [];
    for (let i = 0; i < vertexCount / 3; i++) {
        // three vertices per triangle
        for (let vert = 0; vert < 3; vert++) {
            let shade = (i * 3) / vertexCount;
            colors.push(shade*vert, shade*3*vert, 0.5);
        }
    }
    return colors;
}

function makeDummyTexCoords(vertexCount) {
    const textCoords = [];
    for (let i = 0; i < vertexCount; i++) {
        textCoords.push(0.0, 0.0);
    }
    return textCoords;
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