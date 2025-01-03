import css from "../css/main.css";
import texture from "../resources/eso0932a.jpg";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';


import * as MESH from '../libs/Mesh.js';

var urlParams = new URLSearchParams(window.location.search);
var clock = new THREE.Clock();
let camera, scene, renderer, controls;
let gui, dots_and_dashes;
let container;
let envMap;

let silver = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    envMap: envMap,
    envMapIntensity: 3,
    metalness: 1,
    roughness: 0.1,
});
silver.flatShading = true;

let unused = document.getElementById('stats')
unused.style.display = 'none';

let time_el = document.createElement('div')
time_el.innerHTML = '';
time_el.style.position = 'absolute';
time_el.style.top = '10px';
time_el.style.left = '10px';
time_el.style.color = 'white';
time_el.style.fontSize = '20px';
time_el.style.fontFamily = 'Courier New'
document.getElementById("canvas").appendChild(time_el);

let input_el = document.createElement('input');
input_el.id = 'input';
input_el.style.position = 'absolute';
input_el.style.top = '10px';
input_el.style.left = '10px';
input_el.style.width = '150px';
input_el.style.color = 'black';
input_el.style.fontSize = '20px';
input_el.style.fontFamily = 'Montserrat';
document.getElementById("canvas").appendChild(input_el);

// input_el.style.display = 'none';

const params = {
    morse_code: "Granular",
    major_radius: 10,
    minor_radius: 0.35,//0.25,
    morse_radius: 2.0,
    max_angle: 3 / 4 * 2 * Math.PI,
    rotate: true,
    gui: false,
    stl: false,
    quality: 3,
    input: true,
}

if (urlParams.has('morse')) {
    params.morse_code = urlParams.get('morse');
}

if (urlParams.has('gui')) {
    params.gui = true;
}

if (urlParams.has('norotate')) {
    params.rotate = false;
}

if (urlParams.has('stl')) {
    params.stl = true;
}

if (params.input) {
    input_el.style.display = 'block';
    input_el.value = params.morse_code;
    time_el.style.left = '200px';

    input_el.addEventListener('input', (event) => {
        params.morse_code = event.target.value;
        params.morse_code_converted = stringToMorse(params.morse_code);
        time_el.innerHTML = params.morse_code_converted;
        add_ring();
    });
}

function stringToMorse(str) {
    const morseCode = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..',
        'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
        'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
        'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
        'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
        'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..',
        '1': '.----', '2': '..---', '3': '...--', '4': '....-',
        '5': '.....', '6': '-....', '7': '--...', '8': '---..',
        '9': '----.', '0': '-----',
        ' ': ' '
    };

    return str.toUpperCase().split('').map(letter => morseCode[letter] || '')
        .join(' '); // 3 time units space for space between letters
}


function morseCodeLength(morseCode) {
    return morseCode.split('').reduce((length, char) => length + (char === '-' ? 3 : 1), 0);
}

class CustomEllipticalCurve extends THREE.Curve {
    constructor(radius, angleStart, angleEnd) {
        super();
        this.radius = radius;
        this.angleStart = angleStart;
        this.angleEnd = angleEnd;
    }

    getPoint(t) {
        const angle = this.angleStart + (this.angleEnd - this.angleStart) * t;
        return new THREE.Vector3(
            this.radius * Math.cos(angle),
            this.radius * Math.sin(angle),
            0
        );
    }
}

function createCurvedCylinder(radius, tubeRadius, angleStart, angleEnd, radialSegments) {
    const path = new CustomEllipticalCurve(radius, angleStart, angleEnd);
    const tubeGeometry = new THREE.TubeGeometry(
        path, Math.pow(2, params.quality), tubeRadius, radialSegments, false
    );

    // const mesh = new THREE.Mesh(geometry, silver);

    // // Create caps
    // const sphereGeometry = new THREE.SphereGeometry(tubeRadius, radialSegments, radialSegments);
    // const cap1 = new THREE.Mesh(sphereGeometry, silver);
    // const cap2 = new THREE.Mesh(sphereGeometry, silver);

    // // Position caps at the ends of the curve
    // cap1.position.copy(path.getPoint(0));
    // cap2.position.copy(path.getPoint(1));

    // // Add caps to the mesh
    // mesh.add(cap1);
    // mesh.add(cap2);

    const sphereGeometry = new THREE.SphereGeometry(tubeRadius, radialSegments, radialSegments);
    const cap1 = sphereGeometry.clone();//.translate(...path.getPoint(0).toArray());
    const cap2 = sphereGeometry.clone();//.translate(...path.getPoint(1).toArray());
    cap1.rotateY(-Math.PI / radialSegments / 2)
    cap2.rotateY(-Math.PI / radialSegments / 2)
    cap1.rotateZ(angleStart);
    cap2.rotateZ(angleEnd);
    cap1.translate(...path.getPoint(0).toArray());
    cap2.translate(...path.getPoint(1).toArray());

    // Merge geometries
    const mergedGeometry = BufferGeometryUtils.mergeGeometries([tubeGeometry, cap1, cap2]);
    const mesh = new THREE.Mesh(mergedGeometry, silver);

    return mesh;
}

function morseCodeToGeometries(morseCode, radius) {
    const geometries = [];
    let angle = 0;
    const angleIncrement = params.max_angle / morseCodeLength(morseCode);
    let this_morse_radius = Math.min(params.morse_radius, radius * angleIncrement / 2.);
    // console.log(this_morse_radius);

    for (let char of morseCode) {
        if (char === '.') {
            // console.log('DOT');
            const sphere = new THREE.Mesh(
                // new THREE.SphereGeometry(this_morse_radius, Math.pow(2, params.quality), Math.pow(2, params.quality)),
                new THREE.IcosahedronGeometry(this_morse_radius, params.quality - 3),
                silver
            );
            sphere.position.x = Math.cos(angle + angleIncrement / 2.) * radius;
            sphere.position.y = Math.sin(angle + angleIncrement / 2.) * radius;
            sphere.rotation.x = (angle + angleIncrement / 2.)
            sphere.lookAt(0, 0, 0);
            geometries.push(sphere);
            angle += angleIncrement;
        } else if (char === '-') {
            // console.log('DASH')
            let offset = 4 * this_morse_radius / params.max_angle;
            const curvedCylinder = createCurvedCylinder(
                radius,
                this_morse_radius,
                angle + (0. + offset) * angleIncrement,
                angle + (3 - offset) * angleIncrement,
                Math.pow(2, params.quality) - 1
            );
            geometries.push(curvedCylinder);
            angle += 3 * angleIncrement;
        }
        else {
            // console.log('SPACE')
            angle += angleIncrement;
        }
        // console.log(angle / Math.PI)
    }


    return geometries;
}

function add_ring() {
    if (dots_and_dashes.children.length > 0) {
        dots_and_dashes.clear();
    }
    const geometries = morseCodeToGeometries(params.morse_code_converted, params.major_radius);
    geometries.forEach(geometry => dots_and_dashes.add(geometry));

    let ring = new THREE.Mesh(
        new THREE.TorusGeometry(params.major_radius, params.minor_radius, Math.pow(2, params.quality + 3), Math.pow(2, params.quality + 6)),
        silver
    );
    dots_and_dashes.add(ring);
}

function init() {
    scene = new THREE.Scene();
    const textureLoader = new THREE.TextureLoader();

    let envMap = textureLoader.load(texture);
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    silver.envMap = envMap;
    silver.needsUpdate = true;

    scene.background = envMap;

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.z = -2 * params.major_radius;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container = document.getElementById('canvas');
    container.appendChild(renderer.domElement);

    let hemiLight = new THREE.AmbientLight();
    scene.add(hemiLight);

    let dirLight = new THREE.DirectionalLight();
    dirLight.castShadow = true;
    dirLight.position.set(5, 5, 5);
    camera.add(dirLight);

    params.morse_code_converted = stringToMorse(params.morse_code);
    // time_el.innerHTML = params.morse_code + ': ' + params.morse_code_converted;
    time_el.innerHTML = params.morse_code_converted;



    dots_and_dashes = new THREE.Group();
    scene.add(dots_and_dashes)
    add_ring();

    gui = new GUI();
    gui.add(params, 'morse_code')
        .name('Morse Code')
        .onChange(() => {
            params.morse_code_converted = stringToMorse(params.morse_code);
            time_el.innerHTML = params.morse_code_converted;
            // console.log(params.morse_code_converted)
            add_ring();
        });
    gui.add(params, 'minor_radius', 0.1, 1, 0.01).name('Minor Radius').onChange(() => {
        add_ring();
    });
    gui.add(params, 'major_radius', 1, 50, 1).name('Major Radius').onChange(() => {
        add_ring();
    });
    gui.add(params, 'morse_radius', 0.1, 20, 0.01).name('Morse Radius').onChange(() => {
        add_ring();
    });
    gui.add(params, 'max_angle', 0.1 * Math.PI, 2 * Math.PI, 0.1 * Math.PI).name('Max Angle').onChange(() => {
        add_ring();
    });
    gui.add(params, 'stl').name('Make STL').listen().onChange(() => {
        params.paused = true;
        let model = dots_and_dashes.clone();
        model.rotation.y = 0;
        MESH.make_stl('morse-' + params.morse_code + '.stl', model, params);
    });

    if (params.gui) {
        gui.show();
    } else {
        gui.hide();
    }

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
        silver.envMap = envMap;
        silver.needsUpdate = true;

        if (params.rotate) {
            // ring.rotation.y += 0.01;
            dots_and_dashes.rotation.y += 0.01;
            // ring.rotation.y += 0.01;
        }
    }

    controls = new OrbitControls(camera, container);
    controls.update();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keypress', checkKeys, false);

    onWindowResize();

    animate();
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function checkKeys(event) {
    if (params.input) { return }

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

init();
