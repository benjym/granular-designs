// stolen from https://editor.p5js.org/antfu/sketches/qmDDioP8I

import css from "../css/main.css";

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

import * as MESH from '../libs/Mesh.js';

var urlParams = new URLSearchParams(window.location.search);
// var clock = new THREE.Clock();
let camera, scene, renderer, controls;
let gui, spheres;
let container;
let ring = new THREE.Group();

const material = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.5,
    metalness: 0.2,
    side: THREE.DoubleSide,
    flatShading: true,

    // opacity: 1.0
});

let unused = document.getElementById('stats')
unused.style.display = 'none';

var params = {
    scale: 10, // mm per max diameter
    resolution: 0.05,
    dilate: 0.1,
    stl: false,
    gui: false,
    rotate: true,
    tubeRadius: 0.25,
    generations: 8,
    // minRadiusCompute: 0.005,
    // maxRadiusDisplay: 0.4,
    // maxCenterY: 0.0,
    // opacity: 1.0
}


// Gasket and related functions
function gasket(t, generations = 8) {
    const x0 = 0, y0 = 0, r0 = 1, b0 = -1 / r0;
    const x1 = (1 + t) / 2, y1 = 0, r1 = r0 - Math.sqrt(x1 * x1 + y1 * y1), b1 = 1 / r1;
    const x2 = -r1, y2 = y1, r2 = x1, b2 = 1 / r2;
    const c0 = [x0, y0, b0];
    const c1 = [x1, y1, b1];
    const c2 = [x2, y2, b2];
    const b3 = solve(b0, b1, b2);
    const c3 = [solve(b0 * x0, b1 * x1, b2 * x2, 2) / b3, solve(b0 * y0, b1 * y1, b2 * y2, 2) / b3, b3];
    return [c0, c1, c2, c3, ...circles(c0, c1, c2, c3, generations), ...circles(c3, c1, c2, c0, generations), ...circles(c0, c2, c3, c1, generations), ...circles(c0, c1, c3, c2, generations)];
}

function* circles(c0, c1, c2, c3, depth) {
    if (depth <= 0) return;

    const c = innerSoddy(c0, c1, c2, c3);
    if (Math.abs(c[2]) > 200) return;

    yield c;
    yield* circles(c0, c1, c, c2, depth - 1);
    yield* circles(c1, c, c2, c0, depth - 1);
    yield* circles(c2, c, c0, c1, depth - 1);
}

function innerSoddy([x0, y0, b0], [x1, y1, b1], [x2, y2, b2], [x3, y3, b3]) {
    const b = 2 * (b0 + b1 + b2) - b3;
    return [(2 * (b0 * x0 + b1 * x1 + b2 * x2) - b3 * x3) / b, (2 * (b0 * y0 + b1 * y1 + b2 * y2) - b3 * y3) / b, b];
}

function solve(x, y, z, offset = 0) {
    const b = x + y + z;
    const c = x * x + y * y + z * z - b * b / 2 - offset;
    return Math.sqrt(Math.max(0, b * b - 2 * c)) + b;
}

init();

async function init() {
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1e-3, 100);
    // camera.up.set(0, 0, 1);
    camera.position.set(0, 0, 3 * params.scale);
    let controls_target = new THREE.Vector3(0, 0, 0);
    camera.lookAt(controls_target);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111);

    // const hemiLight = new THREE.HemisphereLight();
    // hemiLight.intensity = 0.35;
    const hemiLight = new THREE.HemisphereLight(
        'white', // bright sky color
        'darkslategrey', // dim ground color
        5, // intensity
    );
    scene.add(hemiLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container = document.getElementById('canvas');
    container.appendChild(renderer.domElement);

    gui = new GUI();
    gui.width = 320;
    gui.add(params, 'generations', 1, 10, 1).name('Generations').onChange(reset_sim);
    // gui.add(params, 'minRadiusCompute', 0.01, 0.1, 0.01).name('Min radius').onChange(reset_sim);
    // gui.add(params, 'maxRadiusDisplay', 0.1, 1, 0.01).name('Max radius').onChange(reset_sim);
    gui.add(params, 'tubeRadius', 0.01, 10, 0.01).name('Tube Radius').onChange(reset_sim);
    gui.add(params, 'resolution', 0.001, 0.1, 0.0001).name('Resolution').onChange(reset_sim);
    gui.add(params, 'scale', 0, 100, 0.01).name('Scale').onChange(reset_sim);
    gui.add(params, 'dilate', -0.5, 0.5, 0.01).name('Dilate').onChange(reset_sim);
    // gui.add(params, 'opacity', 0, 1, 0.01).name('Opacity').onChange(() => {
    //     material.opacity = params.opacity;
    // });
    gui.add(params, 'stl').name('Make STL').listen().onChange(() => {
        params.paused = true;
        MESH.make_stl('apollonian_2d.stl', ring, params);
    });

    if (params.gui) {
        gui.show();
    } else {
        gui.hide();
    }

    controls = new OrbitControls(camera, container);
    controls.target = controls_target;
    controls.update();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keypress', checkKeys, false);

    // update_slope_angle()
    reset_sim();

    onWindowResize();

    animate();
}

function checkKeys(event) {
    if (event.code === 'KeyG') {
        params.gui = !params.gui;
        if (params.gui) {
            gui.show();
        } else {
            gui.hide();
        }
    }

    if (event.code === 'KeyR') {
        params.rotate = !params.rotate;
    }
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}


// Convert circles to toruses and add them to the scene
function reset_sim() {
    if (ring !== undefined) {
        scene.remove(ring);
        ring = new THREE.Group();
        scene.add(ring);
    }
    for (const [x, y, c] of gasket(0, params.generations)) {
        const radius = Math.abs(1 / c) * params.scale;
        const tubeRadius = params.tubeRadius; // Adjust tube radius as needed
        // const radialSegments = 8; // Adjust for smoothness
        // const tubularSegments = 24; // Adjust for smoothness
        const radialSegments = calculateSegments(radius, params.resolution);
        const tubularSegments = calculateSegments(tubeRadius, params.resolution);

        let offsetRadius;
        console.log(c)
        if (c == -1) { offsetRadius = Math.max(0, radius + tubeRadius); }
        else { offsetRadius = Math.max(0, radius - tubeRadius); }

        const geometry = new THREE.TorusGeometry(offsetRadius, tubeRadius * (1 + params.dilate), tubularSegments, radialSegments);
        const torus = new THREE.Mesh(geometry, material);
        torus.position.set(x * params.scale, y * params.scale, 0);
        ring.add(torus);
    }
}

// Camera Position
// camera.position.z = 5;

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function calculateSegments(radius, cutoff) {
    const circumference = 2 * Math.PI * radius;
    const maxSegmentLength = cutoff;
    const minNumberOfSegments = circumference / maxSegmentLength;

    // Since we need an integer number of segments, round up
    return Math.ceil(minNumberOfSegments);
}

// createTorus();
// animate();
