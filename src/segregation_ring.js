import css from "../css/main.css";

import * as DEMCGND from "../resources/DEMCGND.js";

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import * as SPHERES from "../libs/SphereHandler.js"
import * as WALLS from "../libs/WallHandler.js"
import * as LAYOUT from '../libs/Layout.js'
// import { NDSTLLoader, renderSTL } from '../libs/NDSTLLoader.js';
import * as MESH from '../libs/Mesh.js';

var urlParams = new URLSearchParams(window.location.search);
var clock = new THREE.Clock();
let NDDEMCGLib;
let camera, scene, renderer, composer, renderPass, saoPass, controls;
let camera2, scene2, renderer2, controls2;
let gui;
let S;
let container, container2;
let particle_volume;
let ring;
let t_DEM = 0;

let time_el = document.createElement('div')
time_el.innerHTML = 't = ' + String(t_DEM.toFixed(2));
time_el.style.position = 'absolute';
time_el.style.top = '10px';
time_el.style.left = '10px';
document.getElementById("stats").appendChild(time_el);

// SIGNET RING v4
var params = {
    dimension: 3,
    N: 450,//000,
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
    quality: 5,
    vmax: 20, // max velocity to colour by
    omegamax: 20, // max rotation rate to colour by
    particle_opacity: 1.0,
    particle_density: 2700,
    stl: false,
    R_finger: 10,
    mesh_mode: 'objects',
    dt: 2e-4,
    render_frequency: 50,
    dilate: 1.1,
    // save_at: '0.50,5.00,50.00,500.00',
    save_at: '',
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
    rotate: false
}

// BAND v1
// var params = {
//     dimension: 3,
//     N: 1000,
//     paused: false,
//     g_mag: 100,
//     theta: 65, // slope angle in DEGREES
//     boundary: [{ type: 'PBC', min: 0, max: 50 },
//     { type: 'WALL', min: 0, max: 4 },
//     { type: 'PBC', min: 0, max: 2 }],
//     r_max: 0.5,
//     r_min: 0.25,
//     pre_seg: true,
//     gsd: 'bidisperse', // 'uniform' or 'bidisperse
//     ratio: 0.5,
//     lut: 'Size',
//     quality: 5,
//     vmax: 20, // max velocity to colour by
//     omegamax: 20, // max rotation rate to colour by
//     particle_opacity: 1.0,
//     particle_density: 2700,
//     stl: false,
//     R_finger: 10,
//     mesh_mode: 'objects',
//     dt: 2e-4,
//     render_frequency: 50,
//     dilate: 1.2,
//     // save_at: '0.50,5.00,50.00,500.00',
//     save_at: '',
//     wall: false,
//     thickness: 1.5,
//     coverage_angle: 360,
//     shank: {
//         // type: 'protruding', // 'protruding' or 'cylinder'
//         type: 'cylinder', // 'protruding' or 'cylinder'
//         height: 1.0,
//         gravity_tag: true,
//         fontsize: 1
//     },
//     gui: true
// }

set_derived_properties();

function set_derived_properties() {
    // params.average_radius = (params.r_min + params.r_max) / 2.;
    params.particle_volume = 4. / 3. * Math.PI * Math.pow(params.r_min, 3);
    params.particle_mass = params.particle_volume * params.particle_density;

}

let save_at = params.save_at.split(',');

params.average_radius = (params.r_min + params.r_max) / 2.;


particle_volume = 4. / 3. * Math.PI * Math.pow(params.average_radius, 3);
if (urlParams.has('dimension')) {
    params.dimension = parseInt(urlParams.get('dimension'));
}
if (params.dimension === 4) {
    params.L = 2.5;
    params.N = 300
    particle_volume = Math.PI * Math.PI * Math.pow(params.average_radius, 4) / 2.;
}
if (urlParams.has('quality')) {
    params.quality = urlParams.get('quality');
}

// SPHERES.createNDParticleShader(params).then(init);
async function NDDEMPhysics() {
    await DEMCGND().then((lib) => {
        NDDEMCGLib = lib;
    });
}

NDDEMPhysics().then(() => {
    init();
});

async function init() {
    camera = new THREE.PerspectiveCamera(50, window.innerWidth * 0.5 / window.innerHeight, 1e-3, 100);
    camera.up.set(0, 1, 0);
    camera.position.set(
        (params.boundary[0].max + params.boundary[0].min) / 2.,
        // (params.boundary[1].max + params.boundary[1].min) / 2.,
        params.boundary[1].min + 1,
        (params.boundary[2].max + params.boundary[2].min) / 2. + 8);
    camera.lookAt(new THREE.Vector3(
        (params.boundary[0].max + params.boundary[0].min) / 2.,
        // (params.boundary[1].max + params.boundary[1].min) / 2.,
        params.boundary[1].min + 1,
        (params.boundary[2].max + params.boundary[2].min) / 2.));


    camera2 = new THREE.PerspectiveCamera(50, window.innerWidth * 0.5 / window.innerHeight, 1e-3, 100);
    camera2.up.set(0, 0, 1);
    camera2.position.set(0, -0.7 * params.R_finger, 4 * params.R_finger);
    let controls2_target = new THREE.Vector3(0, -0.7 * params.R_finger, 0);
    camera2.lookAt(controls2_target);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111);

    scene2 = new THREE.Scene();
    scene2.background = new THREE.Color(0xFFFFFF);

    const hemiLight = new THREE.HemisphereLight();
    hemiLight.intensity = 0.35;
    scene.add(hemiLight);
    scene2.add(hemiLight.clone());

    const dirLight = new THREE.DirectionalLight();
    dirLight.position.set(2 * params.R_finger, 2 * params.R_finger, 5 * params.R_finger);
    dirLight.castShadow = true;
    dirLight.shadow.camera.zoom = 2;
    scene.add(dirLight);
    scene2.add(dirLight.clone());

    WALLS.wall_material.wireframe = false;
    WALLS.createWalls(scene);
    WALLS.HollowCylinder(params).then((ring) => {
        scene2.add(ring);
        WALLS.toggle_ring_walls(params);
    });
    WALLS.toggle_ring_walls(params);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * 0.5, window.innerHeight);

    renderer2 = new THREE.WebGLRenderer({ antialias: true });
    renderer2.setPixelRatio(window.devicePixelRatio);
    renderer2.setSize(window.innerWidth * 0.5, window.innerHeight);

    // composer = new EffectComposer(renderer2);
    // renderPass = new RenderPass(scene2, camera2);
    // composer.addPass(renderPass);
    // saoPass = new SAOPass(scene2, camera2);
    // composer.addPass(saoPass);
    // const outputPass = new OutputPass();
    // composer.addPass(outputPass);

    container = document.getElementById('canvas');
    container.appendChild(renderer.domElement);

    container2 = document.getElementById('stats');
    container2.appendChild(renderer2.domElement);

    gui = new GUI();
    gui.width = 320;

    const p = gui.addFolder('Particles');

    p.add(params, 'N', 1, 5000, 1).name('Num particles').onChange(reset_sim)
    p.add(params, 'theta', 0, 90, 0.1).name('Slope angle (deg) (W/S)').listen().onChange(() => update_slope_angle());
    p.add(params.boundary[0], 'max', 0, 100, 0.1).name('X<sub>max</sub>').onChange(reset_sim)
    p.add(params.boundary[1], 'max', 0, 100, 0.1).name('Y<sub>max</sub>').onChange(reset_sim)
    p.add(params.boundary[2], 'max', 0, 100, 0.1).name('Z<sub>max</sub>').onChange(reset_sim)
    p.add(params, 'r_min', 0, 1, 0.01).name('Min radius').onChange(reset_sim)
    p.add(params, 'r_max', 0, 1, 0.01).name('Max radius').onChange(reset_sim)
    p.add(params, 'gsd', ['uniform', 'bidisperse']).name('Size distribution').onChange(reset_sim)
    p.add(params, 'ratio', 0, 1, 0.01).name('Bidisp ratio').onChange(reset_sim)
    gui.add(params, 'lut', ['None', 'Size', 'Velocity', 'Rotation']).name('Colour by').onChange(() => SPHERES.update_particle_material(params));
    gui.add(params, 'pre_seg').name('Pre seg').onChange(() => reset_sim());
    gui.add(params, 'paused').name('Paused').listen();
    gui.add(params, 'quality', 1, 10, 1).name('Quality').onChange(() => {
        reset_sim();
        WALLS.toggle_ring_walls(params);
    });
    gui.add(params, 'R_finger', 0, 100, 0.01).name('Inner radius')
    gui.add(params, 'mesh_mode', ['vertices', 'objects']).name('Mesh mode')
    gui.add(params, 'dilate', 0.5, 1.5, 0.01).name('Dilate')
    gui.add(params, 'stl').name('Make STL').listen().onChange(() => {
        params.paused = true;
        MESH.make_stl(String(t_DEM.toFixed(2)) + '.stl', ring, params);
    });
    gui.add(params, 'save_at').name('Save at').onChange(() => { save_at = params.save_at.split(',') });
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
    const shank = gui.addFolder('Shank');
    shank.add(params.shank, 'type', ['protruding', 'cylinder']).name('Type').onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    shank.add(params.shank, 'height', 1, 2, 0.01).onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    shank.add(params.shank, 'gravity_tag').onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    shank.add(params.shank, 'fontsize', 0, 10, 0.01).onChange(() => {
        update_ring_params();
        WALLS.toggle_ring_walls(params)
    });
    // const saoFolder = gui.addFolder('SAO');
    // saoFolder.add(saoPass.params, 'output', {
    //     'Default': SAOPass.OUTPUT.Default,
    //     'SAO Only': SAOPass.OUTPUT.SAO,
    //     'Normal': SAOPass.OUTPUT.Normal
    // }).onChange(function (value) {
    //     saoPass.params.output = value;
    // });
    // saoFolder.add(saoPass.params, 'saoBias', - 1, 1);
    // saoFolder.add(saoPass.params, 'saoIntensity', 0, 1);
    // saoFolder.add(saoPass.params, 'saoScale', 0, 10);
    // saoFolder.add(saoPass.params, 'saoKernelRadius', 1, 100);
    // saoFolder.add(saoPass.params, 'saoMinResolution', 0, 1);
    // saoFolder.add(saoPass.params, 'saoBlur');
    // saoFolder.add(saoPass.params, 'saoBlurRadius', 0, 200);
    // saoFolder.add(saoPass.params, 'saoBlurStdDev', 0.5, 150);
    // saoFolder.add(saoPass.params, 'saoBlurDepthCutoff', 0.0, 0.1);
    // saoFolder.add(saoPass, 'enabled');

    controls = new OrbitControls(camera, container);
    controls.target.x = (params.boundary[0].min + params.boundary[0].max) / 2;
    // controls.target.y = (params.boundary[1].min + params.boundary[1].max) / 2;
    controls.target.y = params.boundary[1].min + 1;
    controls.target.z = (params.boundary[2].min + params.boundary[2].max) / 2;

    // controls.autoRotate = true;
    controls.update();


    controls2 = new OrbitControls(camera2, container2);
    controls2.target = controls2_target;
    // controls2.minPolarAngle = 0;
    // controls2.maxPolarAngle = 0;
    // controls2.autoRotateSpeed = 50;
    controls2.update();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keypress', checkKeys, false);

    // update_slope_angle()
    reset_sim();

    onWindowResize();

    animate();
}

function update_ring_params() {
    params.boundary[0].range = params.boundary[0].max - params.boundary[0].min;
    params.boundary[1].range = params.boundary[1].max - params.boundary[1].min;
    params.boundary[2].range = params.boundary[2].max - params.boundary[2].min;

    params.theta_rad = params.coverage_angle * Math.PI / 180.
    params.R_0 = params.R_finger + params.thickness;
    params.T = 2 * params.boundary[2].range * params.theta_rad * params.R_0 / (2 * params.boundary[0].range - params.theta_rad * params.boundary[1].range); // distance into page, proportional to boundary[2].range !!
    params.R_1 = params.R_0 + params.boundary[1].range * params.T / params.boundary[2].range;

    if (2 * params.boundary[0].range < params.theta_rad * params.boundary[2].range) {
        console.warn('Ring is not long enough in D0 to fit the spheres')
    }
    // console.log(params.boundary)
    // console.log(params.theta_rad)
    // console.log(params.R_0, params.R_1, params.T)

}

function reset_sim() {
    update_ring_params();
    WALLS.toggle_ring_walls(params)

    SPHERES.createNDParticleShader(params).then(() => {
        if (params.dimension == 1) {
            S = new NDDEMCGLib.DEMCG1D(params.N);
        } else if (params.dimension == 2) {
            S = new NDDEMCGLib.DEMCG2D(params.N);
        } else if (params.dimension == 3) {
            S = new NDDEMCGLib.DEMCG3D(params.N);
        } else if (params.dimension == 4) {
            S = new NDDEMCGLib.DEMCG4D(params.N);
        } else if (params.dimension == 5) {
            S = new NDDEMCGLib.DEMCG5D(params.N);
        }
        finish_setup();
        t_DEM = 0;
        SPHERES.add_spheres(S, params, scene);
        update_slope_angle()


    });
}

function update_slope_angle() {
    S.simu_interpret_command("gravity " + String(-params.g_mag * Math.cos(params.theta * Math.PI / 180.)) + " " + String(-params.g_mag * Math.sin(params.theta * Math.PI / 180.)) + " 0 " + "0 ".repeat(params.dimension - 3));
    camera.up.set(Math.cos(params.theta * Math.PI / 180.), Math.sin(params.theta * Math.PI / 180.), 0);
    if (controls !== undefined) { controls.update(); }
    console.log(params.theta)
}

function checkKeys(event) {
    if (event.code === 'KeyW') {
        params.theta += 0.1;
        update_slope_angle();
    }
    if (event.code === 'KeyS') {
        params.theta -= 0.1;
        update_slope_angle();
    }

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

    camera2.aspect = container2.clientWidth / container2.clientHeight;
    camera2.updateProjectionMatrix();

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer2.setSize(container2.clientWidth, container2.clientHeight);

    // composer.setSize(container.clientWidth, container.clientHeight);

}

function animate() {
    requestAnimationFrame(animate);
    if (S !== undefined) {
        SPHERES.move_spheres(S, params);
        if (!params.paused) {
            S.simu_step_forward(params.render_frequency);
            t_DEM += params.render_frequency * params.dt;
            if (params.show_time) {
                time_el.innerHTML = 't = ' + String(t_DEM.toFixed(2));
            } else {
                time_el.innerHTML = '';
            }
            SPHERES.draw_force_network(S, params, scene);
        }
        if (save_at.includes(String(t_DEM.toFixed(2)))) {
            console.log('Saving at t = ' + String(t_DEM.toFixed(2)) + '...')
            MESH.make_stl(String(t_DEM.toFixed(2)) + '.stl', ring, params);
        }

        if (ring !== undefined) { scene2.remove(ring) }
        if (params.shank.type === 'protruding') {
            ring = MESH.map_to_plane(SPHERES.spheres, params);
        } else {
            ring = MESH.map_to_torus(SPHERES.spheres, params);
        }
        scene2.add(ring);
    }
    if (controls !== undefined) { controls.update(); }
    if (controls2 !== undefined) { controls2.update(); }

    if (params.rotate) {
        ring.rotation.y = t_DEM;
        WALLS.ring.rotation.y = t_DEM;
    }

    renderer.render(scene, camera);
    // composer.render();
    renderer2.render(scene2, camera2);

    // console.log(controls2.target)
}


function finish_setup() {
    S.simu_interpret_command("dimensions " + String(params.dimension) + " " + String(params.N));
    S.simu_interpret_command("radius -1 0.5");
    let m = 4. / 3. * Math.PI * 0.5 * 0.5 * 0.5 * params.particle_density;
    S.simu_interpret_command("mass -1 " + String(m));
    S.simu_interpret_command("auto rho");
    if (params.gsd === 'uniform') {
        S.simu_interpret_command("auto radius uniform " + params.r_min + " " + params.r_max);
    } else if (params.gsd === 'bidisperse') {
        S.simu_interpret_command("auto radius bidisperse " + params.r_min + " " + params.r_max + " 0.5");
    }

    S.simu_interpret_command("auto mass");
    S.simu_interpret_command("auto inertia");
    S.simu_interpret_command("auto skin");

    update_boundary_conditions();
    S.simu_interpret_command("gravity " + String(-params.g_mag * Math.cos(params.theta * Math.PI / 180.)) + " " + String(-params.g_mag * Math.sin(params.theta * Math.PI / 180.)) + " 0 " + "0 ".repeat(params.dimension - 3))

    // S.simu_interpret_command("auto location roughinclineplane");
    S.simu_interpret_command("auto location randomdrop");

    let r = S.simu_getRadii();
    if (params.pre_seg) {
        for (let i = 0; i < params.N; i++) {
            if (r[i] > (params.r_min + params.r_max) / 2.) {
                S.simu_fixParticle(i, [
                    params.boundary[0].min + Math.random() * params.boundary[0].range,
                    params.boundary[1].min + Math.random() * params.boundary[1].range / 2. + params.boundary[1].range / 2.,
                    params.boundary[2].min + Math.random() * params.boundary[2].range]);
            } else {
                S.simu_fixParticle(i, [
                    params.boundary[0].min + Math.random() * params.boundary[0].range,
                    params.boundary[1].min + Math.random() * params.boundary[1].range / 2.,
                    params.boundary[2].min + Math.random() * params.boundary[2].range]);
            }

        }
    }

    let tc = params.dt * 20;
    let rest = 0.2; // super low restitution coeff to dampen out quickly
    let vals = SPHERES.setCollisionTimeAndRestitutionCoefficient(tc, rest, params.particle_mass)

    S.simu_interpret_command("set Kn " + String(vals.stiffness));
    S.simu_interpret_command("set Kt " + String(0.8 * vals.stiffness));
    S.simu_interpret_command("set GammaN " + String(vals.dissipation));
    S.simu_interpret_command("set GammaT " + String(vals.dissipation));
    S.simu_interpret_command("set damping 0");
    S.simu_interpret_command("set Mu 0.5");
    S.simu_interpret_command("set Mu_wall 2");
    S.simu_interpret_command("set T 150");
    S.simu_interpret_command("set dt " + String(params.dt));
    S.simu_interpret_command("set tdump 1000000"); // how often to calculate wall forces
    S.simu_interpret_command("auto skin");
    S.simu_finalise_init();
}

function update_boundary_conditions() {
    for (let i = 0; i < params.dimension; i++) {
        S.simu_interpret_command("boundary " + String(i) + " " + params.boundary[i].type + " " + String(params.boundary[i].min) + " " + String(params.boundary[i].max));
    }
}
