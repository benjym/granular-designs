import css from "../css/main.css";

import { Noise } from 'noisejs';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

import * as SPHERES from "../libs/SphereHandler.js"
import * as WALLS from "../libs/WallHandler.js"
import * as MESH from '../libs/Mesh.js';

var urlParams = new URLSearchParams(window.location.search);
var clock = new THREE.Clock();
let camera, scene, renderer, controls;
let gui, spheres;
let container;
let ring;
let t = 0;

let unused = document.getElementById('stats')
unused.style.display = 'none';

// SIGNET RING v4
var params = {
    dimension: 3,
    N: 7,//000,
    // packing_fraction: 0.5,
    paused: false,
    g_mag: 100,
    theta: 65, // slope angle in DEGREES
    boundary: [{ type: 'PBC', min: 0, max: 12 },
    { type: 'WALL', min: 0, max: 4 },
    { type: 'PBC', min: 0, max: 2 }],
    r_max: 0.5,
    r_min: 0.25,
    pre_seg: true,
    gsd: 'bidisperse', // 'uniform' or 'bidisperse
    ratio: 0.5,
    lut: 'Size',
    quality: 6,
    dilate: 0.9,
    z_off: 0.25,
    vmax: 20, // max velocity to colour by
    omegamax: 20, // max rotation rate to colour by
    particle_opacity: 1.0,
    particle_density: 2700,
    stl: false,
    R_finger: 10,
    wall: true,
    thickness: 1.5,
    coverage_angle: 90,
    shank: {
        type: 'protruding', // 'protruding' or 'cylinder'
        // type: 'cylinder', // 'protruding' or 'cylinder'
        height: 1.0,
        gravity_tag: false,
        fontsize: 1
    },
    gui: true,
    rotate: false,
    roughness: {
        intensity: 0.5,
        length: 1.0,
        intensity_scaling: 0.5,
        length_scaling: 0.5,
        inherit: false
    }
}

init();

async function init() {
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1e-3, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -1.8 * params.R_finger, 6 * params.R_finger);
    let controls_target = new THREE.Vector3(0, -1.8 * params.R_finger, 0);
    camera.lookAt(controls_target);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111);

    const hemiLight = new THREE.HemisphereLight();
    hemiLight.intensity = 0.35;
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight();
    dirLight.position.set(2 * params.R_finger, 2 * params.R_finger, 5 * params.R_finger);
    dirLight.castShadow = true;
    dirLight.shadow.camera.zoom = 2;
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);

    WALLS.wall_material.wireframe = false;
    WALLS.HollowCylinder(params).then((ring) => {
        scene.add(ring);
        WALLS.toggle_ring_walls(params);
    });
    WALLS.toggle_ring_walls(params);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    container = document.getElementById('canvas');
    container.appendChild(renderer.domElement);

    gui = new GUI();
    gui.width = 320;

    gui.add(params, 'N', 1, 10, 1).name('Num particles').onChange(reset_sim)
    gui.add(params, 'paused').name('Paused').listen();
    gui.add(params, 'quality', 1, 10, 1).name('Quality').onChange(() => {
        reset_sim();
        WALLS.toggle_ring_walls(params);
    });
    gui.add(params, 'R_finger', 0, 100, 0.01).name('Inner radius')
    gui.add(params, 'dilate', 0.5, 1.5, 0.01).name('Dilate').onChange(reset_sim);
    gui.add(params, 'z_off', 0, 2, 0.01).name('Z offset').onChange(reset_sim);
    gui.add(params, 'stl').name('Make STL').listen().onChange(() => {
        params.paused = true;
        MESH.make_stl('roughness_ring.stl', spheres, params);
    });
    gui.add(params, 'wall').name('Show walls').onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    gui.add(params, 'thickness', 0, 3, 0.01).name('Thickness').onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    gui.add(params, 'coverage_angle', 0, 360, 1).name('Coverage angle').onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    gui.add(params.shank, 'type', ['protruding', 'cylinder']).name('Shank type').onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    gui.add(params.shank, 'height', 1, 2, 0.01).name('Shank height').onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    gui.add(params.roughness, 'intensity', 0, 2, 0.01).name('Roughness intensity').onChange(reset_sim);
    gui.add(params.roughness, 'length', 0, 2, 0.01).name('Roughness length').onChange(reset_sim);
    gui.add(params.roughness, 'intensity_scaling', -2, 5, 0.01).name('Roughness int scl').onChange(reset_sim);
    gui.add(params.roughness, 'length_scaling', -2, 5, 0.01).name('Roughness lgth scl').onChange(reset_sim);
    gui.add(params.roughness, 'inherit').name('Inherit roughness').onChange(reset_sim);

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

function reset_sim() {
    update_ring_params();
    WALLS.toggle_ring_walls(params)
    add_spheres();
    // SPHERES.reset_spheres(params);
}

function update_ring_params() {
    params.R_0 = params.R_finger + params.thickness;
    params.particle_radius = params.R_0 / (params.N);
    params.theta_rad = params.coverage_angle * Math.PI / 180.

    params.depth = 2 * params.particle_radius; //
    // params.R_1 = params.R_0 + params.boundary[1].range * params.T / params.boundary[2].range;

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

function add_spheres() {
    if (spheres === undefined) {
        spheres = new THREE.Group();
        scene.add(spheres);
    } else {
        scene.remove(spheres);
        spheres.clear();
    }

    for (let i = 0; i < params.N; i++) {
        const material = new THREE.MeshStandardMaterial();
        material.side = THREE.DoubleSide;
        material.flatShading = true;
        var object = new THREE.Mesh(new THREE.SphereGeometry(params.particle_radius * params.dilate, Math.pow(2, params.quality), Math.pow(2, params.quality)), material);
        object.position.set(
            i * params.particle_radius * 2 - params.R_0 + params.particle_radius,
            params.particle_radius - params.z_off,
            params.particle_radius);
        object.rotation.z = Math.PI / 2;
        spheres.add(object);

    }

    for (let i = 0; i < params.N; i++) {
        let noise = new Noise(Math.random());
        let sphere = spheres.children[i];
        const positions = sphere.geometry.getAttribute('position');
        const normals = sphere.geometry.getAttribute('normal');

        let ref_attribute = positions;
        if (i > 0 && params.roughness.inhert) {
            ref_attribute = spheres.children[i - 1].geometry.getAttribute('position');
        }
        let x = 0, y = 0, z = 0, intensity = 0, length = 0;

        if (i == 0) {
            intensity = 0;
            length = 0;
        } else {
            intensity = params.particle_radius * Math.pow((i / params.N), params.roughness.intensity_scaling) * params.roughness.intensity;
            length = Math.pow((i / params.N), params.roughness.length_scaling) * params.roughness.length;
        }
        console.log('iter', i, 'int', intensity, 'length', length);
        for (let j = 0; j < positions.count; j++) {
            const noiseValue = noise.simplex3(
                // const noiseValue = noise.perlin3(
                positions.getX(j) * length,
                positions.getY(j) * length,
                positions.getZ(j) * length
            );
            // console.log(positions.getX(j) / params.particle_radius, positions.getY(j) / params.particle_radius, positions.getZ(j) / params.particle_radius);

            x = ref_attribute.getX(j);// + noiseValue * intensity;
            y = ref_attribute.getY(j);// + noiseValue * intensity;
            z = ref_attribute.getZ(j);// + noiseValue * intensity;
            // positions.setXYZ(j, x, y, z);
            positions.setXYZ(
                j,
                x + normals.getX(j) * noiseValue * intensity,
                y + normals.getY(j) * noiseValue * intensity,
                z + normals.getZ(j) * noiseValue * intensity
            );

        }
        positions.needsUpdate = true; // required after the first render
    }
    scene.add(spheres);
}

function animate() {

    requestAnimationFrame(animate);
    if (controls !== undefined) { controls.update(); }

    if (params.rotate) {
        // ring.rotation.y = t_DEM;
        WALLS.ring.rotation.y = clock``;
    }

    renderer.render(scene, camera);
}