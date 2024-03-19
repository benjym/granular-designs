// stolen from https://observablehq.com/@esperanc/3d-apollonian-sphere-packings

import css from "../css/main.css";

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

import * as MESH from '../libs/Mesh.js';

var urlParams = new URLSearchParams(window.location.search);
// var clock = new THREE.Clock();
let camera, scene, renderer, controls;
let gui, spheres;
let container;
let ring;
let t = 0;

const material = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.5,
    metalness: 0.2,
    side: THREE.DoubleSide,
    // opacity: 1.0
});

let unused = document.getElementById('stats')
unused.style.display = 'none';

var params = {
    scale: 10, // mm per max diameter
    lut: 'Size',
    quality: 6,
    dilate: 0.01,
    stl: false,
    gui: false,
    rotate: true,
    generations: 8,
    minRadiusCompute: 0.005,
    maxRadiusDisplay: 0.4,
    maxCenterY: 0.0,
    // opacity: 1.0
}

let basis = [
    [1, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
]

let I = [
    (A, B, C, D, E) => [-A, A + B, A + C, A + D, A + E],
    (A, B, C, D, E) => [B + A, -B, B + C, B + D, B + E],
    (A, B, C, D, E) => [C + A, C + B, -C, C + D, C + E],
    (A, B, C, D, E) => [D + A, D + B, D + C, -D, D + E],
    (A, B, C, D, E) => [E + A, E + B, E + C, E + D, -E]
]

init();

async function init() {
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1e-3, 100);
    // camera.up.set(0, 0, 1);
    camera.position.set(3 * params.scale, 0, 0);
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

    // const dirLight = new THREE.DirectionalLight();
    // dirLight.castShadow = true;
    // camera.add(dirLight);
    // dirLight.position.set(-5 * params.scale, 5 * params.scale, 5 * params.scale);

    // const dirLight2 = new THREE.DirectionalLight();
    // dirLight2.castShadow = true;
    // camera.add(dirLight2);
    // dirLight2.position.set(-5 * params.scale, -5 * params.scale, -5 * params.scale);

    // const ambientLight = new THREE.AmbientLight(0xAAAAAA); // soft white light
    // scene.add(ambientLight);

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
    gui.add(params, 'minRadiusCompute', 0.01, 0.1, 0.01).name('Min radius').onChange(reset_sim);
    gui.add(params, 'maxRadiusDisplay', 0.1, 1, 0.01).name('Max radius').onChange(reset_sim);
    gui.add(params, 'maxCenterY', -1, 1, 0.01).name('Max Y').onChange(reset_sim);
    gui.add(params, 'quality', 1, 10, 1).name('Quality').onChange(reset_sim);
    gui.add(params, 'scale', 0, 100, 0.01).name('Scale').onChange(reset_sim);
    gui.add(params, 'dilate', -0.5, 0.5, 0.01).name('Dilate').onChange(reset_sim);
    // gui.add(params, 'opacity', 0, 1, 0.01).name('Opacity').onChange(() => {
    //     material.opacity = params.opacity;
    // });
    gui.add(params, 'stl').name('Make STL').listen().onChange(() => {
        params.paused = true;
        MESH.make_stl('apollonian.stl', spheres, params);
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

function reset_sim() {
    add_spheres();
    // SPHERES.reset_spheres(params);
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
    let app = apollonian()
    let loc = 0, r = 0;
    for (let a = 0; a < app.length; a++) {
        let N = app[a].length;
        for (let i = 0; i < N; i++) {
            loc = app[a][i][0];
            r = app[a][i][1];
            if (r < params.minRadiusCompute || r > params.maxRadiusDisplay || loc[1] > params.maxCenterY) continue;
            // console.log(loc, r)

            // let quality = parseInt(Math.pow(2, 4 * params.quality * r));
            let quality = Math.pow(2, params.quality);
            if (r < 0.1) {
                quality /= 2;
            }
            if (r < 0.02) {
                quality /= 2;
            }
            if (r < 0.005) {
                quality /= 2;
            }


            var object = new THREE.Mesh(new THREE.SphereGeometry(params.scale * r + params.dilate, quality, quality), material);
            object.position.set(
                loc[0] * params.scale,
                loc[1] * params.scale,
                loc[2] * params.scale
            );
            object.rotation.z = Math.PI / 2;
            spheres.add(object);

        }
    }
    // spheres.rotateY(Math.PI / 2);
    scene.add(spheres);
}

function animate() {

    requestAnimationFrame(animate);
    if (controls !== undefined) { controls.update(); }

    if (params.rotate) {
        spheres.rotation.x += 0.01;
        spheres.rotation.z -= 0.01;
        // WALLS.ring.rotation.y = clock;
    }

    renderer.render(scene, camera);
}

function curv(a) {
    return a[a.length - 1] - a[a.length - 2];
}

function invCoords(x, r) {
    const kappa = 1 / r;
    const dot2 = x.reduce((acc, d) => acc + d * d, 0);
    return [
        ...x.map((d) => d / r),
        ((dot2 - r * r - 1) * kappa) / 2,
        ((dot2 - r * r + 1) * kappa) / 2
    ];
}

function regCoords(a) {
    const n = a.length - 2;
    const kappa = curv(a);
    const r = 1 / kappa;
    return [a.slice(0, n).map((d) => d * r), r];
}

function specialToCartesian(A, B, C, D, E) {
    const rt2o2 = Math.sqrt(2) / 2;
    const rt6o2 = Math.sqrt(6) / 2;
    let res = regCoords([
        (-B + C + D - E) * rt2o2,
        (B - C + D - E) * rt2o2,
        (B + C - D - E) * rt2o2,
        A - B - C - D - E,
        (B + C + D + E) * rt6o2
    ]);
    return res
}

function generate(basis) {
    const result = [];
    const rt6o2 = Math.sqrt(6) / 2;
    for (let j = 0; j < basis.length; j++) {
        let [A, B, C, D, E] = basis[j];
        const curvJ = (B + C + D + E) * rt6o2 - (A - B - C - D - E);
        for (let i of [0, 1, 2, 3, 4]) {
            const tmp = I[i](A, B, C, D, E);
            const [A1, B1, C1, D1, E1] = tmp;
            const curvI = (B1 + C1 + D1 + E1) * rt6o2 - (A1 - B1 - C1 - D1 - E1);
            if (
                curvI <= curvJ ||
                (i == 0 && (B1 < A1 || C1 < A1 || D1 < A1 || E1 < A1)) ||
                (i == 1 && (A1 <= B1 || C1 < B1 || D1 < B1 || E1 < B1)) ||
                (i == 2 && (A1 <= C1 || B1 <= C1 || D1 < C1 || E1 < C1)) ||
                (i == 3 && (A1 <= D1 || B1 <= D1 || C1 <= D1 || E1 < D1)) ||
                (i == 4 && (A1 <= E1 || B1 <= E1 || C1 <= E1 || D1 <= E1))
            )
                continue;
            result.push([A1, B1, C1, D1, E1]);
        }
    }
    return result;
}

function apollonian() {
    let gen = basis;
    let result = [basis.map((s) => specialToCartesian(...s))];
    let i = 0;
    for (let i = 1; i <= params.generations; i++) {
        const spheres = [];
        const nextGen = [];
        for (let s of gen) {
            const sph = specialToCartesian(...s);
            if (Math.abs(sph[1]) >= params.minRadiusCompute) {
                spheres.push(sph);
                nextGen.push(s);
            }
        }
        if (spheres.length == 0) break;
        gen = generate(nextGen);
        result.push(spheres);
    }
    return result;
}

// let packing = []
// packing.push()
// console.log(basis)
// let r = generate(basis)
// console.log(r)
// console.log(generate(r))