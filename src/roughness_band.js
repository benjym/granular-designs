import css from "../css/main.css";
import texture from "../resources/eso0932a.jpg";
import logo from "../resources/gd.obj";

import { Noise } from 'noisejs';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { ExtrudeGeometry } from "../libs/ExtrudeGeometry.js";
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';


import * as SPHERES from "../libs/SphereHandler.js"
import * as MESH from '../libs/Mesh.js';

var urlParams = new URLSearchParams(window.location.search);
var clock = new THREE.Clock();
let camera, scene, renderer, controls;
let gui;
let container;
let ring;
let t = 0;
let material, geometry, logo_obj;
let this_mesh;
let envMap;
let spheres = new THREE.Group();

let unused = document.getElementById('stats')
unused.style.display = 'none';

// SIGNET RING v4
var params = {
    resolution: 0.05,
    stl: false,
    R_finger: 10,
    depth: 6,
    // thickness: 1.5,
    gui: false,
    rotate: true,
    n: 5,
    noise: {
        maxIntensity: 2.5,
        maxLength: 0.5,
        N: 5
    },
    fill_fraction: 0.8,
    max_attempts: 1000,
    min_radius: 0.1,
    max_radius: 1,
    bevel: true,
}

init().then(() => {
    add_logo().then((r) => {
        logo_obj = r.children[0];
        logo_obj.scale.set(0.3, 0.3, 0.3);
        logo_obj.position.set(params.R_finger + 0.5, 0, 0);
        logo_obj.rotation.y = -Math.PI / 2;
        logo_obj.updateMatrix();

        logo_obj.geometry.applyMatrix4(logo_obj.matrix);
        console.log(logo_obj)
        reset_sim();
    })
});

async function init() {

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    // camera.up.set(0, 0, 1);
    camera.position.set(4 * params.R_finger, 0, 0);
    let controls_target = new THREE.Vector3(0, 0, 0);
    camera.lookAt(controls_target);

    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x111);
    const textureLoader = new THREE.TextureLoader();

    envMap = textureLoader.load(texture);
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;

    scene.background = envMap;

    const hemiLight = new THREE.AmbientLight();
    hemiLight.intensity = 1;
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight();
    dirLight.position.set(2 * params.R_finger, 2 * params.R_finger, 5 * params.R_finger);
    dirLight.castShadow = true;
    dirLight.shadow.camera.zoom = 2;
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    container = document.getElementById('canvas');
    container.appendChild(renderer.domElement);

    material = new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 1, envMap: envMap, envMapIntensity: 5 });
    material.side = THREE.DoubleSide;
    material.flatShading = true;

    // Create a cylinder with BufferGeometry
    // const geometry = new THREE.CylinderGeometry(5, 5, 10, 32, 1, true);
    // cylinder = new THREE.Mesh(geometry, material);
    // scene.add(cylinder);


    gui = new GUI();
    gui.width = 320;

    gui.add(params, 'resolution', 0, 1, 0.001).name('Resolution').onChange(reset_sim);
    gui.add(params, 'R_finger', 0, 100, 0.01).name('Inner radius').onChange(reset_sim)
    gui.add(params, 'depth', 0, 100, 0.01).name('Depth').onChange(reset_sim)
    // gui.add(params.noise, 'maxIntensity', 0, 5, 0.01).name('Roughness intensity').onChange(reset_sim);
    // gui.add(params.noise, 'maxLength', 0, 1, 0.01).name('Roughness length').onChange(reset_sim);
    // gui.add(params.noise, 'N', 1, 10, 1).name('Roughness layers').onChange(reset_sim);
    gui.add(params, 'rotate').name('Rotate');
    gui.add(params, 'n').name('Sides').onChange(reset_sim);
    gui.add(params, 'min_radius', 0, 1, 0.01).name('Min radius').onChange(reset_sim);
    gui.add(params, 'max_radius', 0, 10, 0.01).name('Max radius').onChange(reset_sim);
    gui.add(params, 'fill_fraction', 0, 1, 0.01).name('Fill fraction').onChange(reset_sim);
    gui.add(params, 'bevel').name('Bevel').onChange(reset_sim);
    gui.add(params, 'stl').name('Make STL').listen().onChange(() => {
        ring.rotation.z = 0;
        MESH.make_stl('roughness-' + params.n + '.stl', ring, params);
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


    onWindowResize();

    animate();
}

function reset_sim() {
    update_ring_params();
    // add_perlin_noise();
    add_sphere_noise();
    // SPHERES.reset_spheres(params);
}

function update_ring_params() {
    params.R_0 = params.R_finger + params.max_radius * 1.01;
    params.theta_rad = params.coverage_angle * Math.PI / 180.
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

// Function to get coordinates of vertices
function getVertices(n, radius) {
    let vertices = [];
    for (let i = 0; i < n; i++) {
        const angle = 2 * Math.PI * i / n;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        vertices.push(new THREE.Vector3(x, 0, y));
    }
    return vertices;
}

// Function to interpolate along a side
function interpolateOnSide(vertex1, vertex2, s) {
    return new THREE.Vector3(
        vertex1.x + (vertex2.x - vertex1.x) * s,
        vertex1.y + (vertex2.y - vertex1.y) * s,
        vertex1.z + (vertex2.z - vertex1.z) * s
    );
}

function logspace(start, end, num) {
    const logStart = Math.log10(start);
    const logEnd = Math.log10(end);
    const step = (logEnd - logStart) / (num - 1);

    let arr = [];
    for (let i = 0; i < num; i++) {
        arr.push(Math.pow(10, logStart + step * i));
    }
    return arr;
}

function calculateSphereSegments(radius, cutoff) {
    const circumference = 2 * Math.PI * radius;
    const maxSegmentLength = cutoff;
    const minNumberOfSegments = circumference / maxSegmentLength;

    // Since we need an integer number of segments, round up
    return Math.ceil(minNumberOfSegments);
}

function add_sphere_noise() {
    let rot = 0;
    if (ring !== undefined) {
        rot = ring.rotation.z;
        scene.remove(ring);
    }

    const size = params.R_0 / Math.cos(Math.PI / params.n); // https://en.wikipedia.org/wiki/Regular_polygon#:~:text=5%5D%5B6%5D-,Circumradius,-%5Bedit%5D
    const side_length = size * 2 * Math.sin(Math.PI / params.n);

    // Create an n-sided polygon shape
    const shape = new THREE.Shape();
    const angle = Math.PI * 2 / params.n;

    for (let i = 0; i < params.n; i++) {
        const x = Math.cos(i * angle) * size;
        const y = Math.sin(i * angle) * size;
        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();

    let hole = new THREE.Path();
    hole.absarc(0, 0, params.R_finger, 0, Math.PI * 2, false);
    shape.holes.push(hole);

    let bevel = 0.5;

    // Extrude the shape
    var extrudeSettings = {
        depth: params.depth,
        bevelEnabled: params.bevel,
        // bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelOffset: -bevel,
        bevelSegments: 10,
        curveSegments: calculateSphereSegments(params.R_finger, params.resolution), // higher because its big
    };

    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -params.depth / 2);
    geometry.rotateX(Math.PI / 2);

    this_mesh = new THREE.Mesh(geometry, material);
    // this_mesh.material.wireframe = true;

    // let internal_cylinder = new THREE.Mesh(
    //     new THREE.CylinderGeometry(params.R_finger, params.R_finger, 6 * params.depth, Math.pow(2, params.quality + 1), 2, false),
    //     material
    // )

    // console.log(cylinder)

    spheres = new THREE.Group();

    // Get vertices of the polygon
    const vertices = getVertices(params.n, size);

    // Iterate through each side
    for (let i = 0; i < params.n; i++) {
        let startVertex = vertices[i];
        let endVertex = vertices[(i + 1) % vertices.length];

        // let r = params.min_radius + (i / params.n) * (params.max_radius - params.min_radius); // linear
        let r = logspace(params.min_radius, params.max_radius, params.n)[i];

        // let sphere = new THREE.Mesh(new THREE.SphereGeometry(1, Math.pow(2, params.quality - (params.n - i - 1) / 2.), Math.pow(2, params.quality - (params.n - i - 1) / 2.)),
        // material);
        const segments = calculateSphereSegments(r, params.resolution);
        let sphere = new THREE.Mesh(new THREE.SphereGeometry(r, segments, segments), material);


        let N = (side_length * params.depth * params.fill_fraction) / (Math.PI * r * r);
        let stored = [];
        let n = 0;
        let attempts = 0;
        while (n <= N) {
            let s = r + (side_length - 2 * r) * Math.random();
            let z = (params.depth - r) * (Math.random() - 0.5);

            let overlap = false;
            for (let j = 0; j < stored.length; j++) {
                let dist = Math.hypot(stored[j][0] - s, stored[j][1] - z);
                if (dist < 2 * r) { // Adjust this value as necessary
                    overlap = true;
                    attempts++;
                    break;
                }
            }
            if (attempts > params.max_attempts) {
                break;
            }

            if (!overlap) {
                attempts = 0;
                stored.push([s, z]);

                let position = interpolateOnSide(startVertex, endVertex, s / side_length);
                position.y = z;

                let obj = sphere.clone();
                obj.position.copy(position);
                // obj.scale.set(r, r, r)
                spheres.add(obj);

                n++;
            }
        }
    }

    MESH.subtraction(this_mesh.geometry, logo_obj.geometry, material).then((v) => {
        ring = v;
        ring.add(spheres);
        scene.add(ring);
        ring.rotation.z = rot;
        ring.rotation.x = Math.PI / 2;
    })


}

async function add_logo(path) {
    return new Promise((resolve, reject) => {
        const loader = new OBJLoader();
        loader.load(logo, resolve, undefined, reject);
    });
}

function add_perlin_noise() {
    let rot = 0;
    if (ring !== undefined) {
        rot = ring.rotation.z;
        scene.remove(ring);
    }
    let geometry = new THREE.CylinderGeometry(params.R_0, params.R_0, params.depth, Math.pow(2, params.quality), Math.pow(2, params.quality - 1), false);
    this_mesh = new THREE.Mesh(geometry, material);

    // Initialize noise

    let noises = [];
    let lengths = [params.noise.maxLength];
    for (let i = 0; i < params.noise.N; i++) { noises.push(new Noise(Math.random())); }
    for (let i = 1; i < params.noise.N; i++) { lengths.push(lengths[lengths.length - 1] * 2.); }
    console.log(lengths)

    // Apply noise to cylinder vertices
    const positions = geometry.attributes.position;
    const normals = geometry.attributes.normal;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const theta = Math.atan2(z, x); // Angle for radial section

        // Determine noise intensity based on section
        const intensity = Math.pow(Math.cos(theta / 2.), 2) * params.noise.maxIntensity;
        // console.log(theta, intensity)
        for (let j = 0; j < 3; j++) {
            normals.setXYZ(
                i,
                x / params.R_0,
                0,
                z / params.R_0
            );
        }
        let noiseValue = 0;
        for (let j = 0; j < params.noise.N; j++) {
            noiseValue += noises[j].simplex3(x * lengths[j], y * lengths[j], z * lengths[j]) * intensity;
        }


        // noiseValue *= Math.sin(1 - 2 * Math.abs(y / params.depth));
        // console.log(2 * Math.abs(y / params.depth));

        let normal = new THREE.Vector3(
            x / params.R_0,
            0,
            z / params.R_0
        );
        // Displace vertex along normal
        positions.setXYZ(
            i,
            x + normal.x * noiseValue * noiseValue,
            y,
            z + normal.z * noiseValue * noiseValue,
        );
    }

    positions.needsUpdate = true;

    let internal_cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(params.R_finger, params.R_finger, 2 * params.depth, Math.pow(2, params.quality), Math.pow(2, params.quality - 1), false),
        material
    )

    MESH.subtraction(this_mesh.geometry, internal_cylinder.geometry, material).then((v) => {
        ring = v;
        scene.add(ring);
        ring.rotation.z = rot;
        ring.rotation.x = Math.PI / 2;
    })
    // console.log(cylinder)

}

function animate() {

    requestAnimationFrame(animate);
    if (controls !== undefined) { controls.update(); }

    if (params.rotate && ring !== undefined) {
        ring.rotation.z += 0.01;
    }

    renderer.render(scene, camera);
}
