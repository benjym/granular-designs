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
    roughness: 0,
    reflectivity: 1,
});

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

const params = {
    morse_code: "SOS",
    major_radius: 10,
    minor_radius: 0.25,
    morse_radius: 0.5,
    max_angle: 3 / 4 * 2 * Math.PI,
    rotate: true,
    gui: false,
    stl: false,
    quality: 6,
}

if (urlParams.has('morse')) {
    params.morse_code = urlParams.get('morse');
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
    const cap1 = sphereGeometry.clone().translate(...path.getPoint(0).toArray());
    const cap2 = sphereGeometry.clone().translate(...path.getPoint(1).toArray());

    // Merge geometries
    const mergedGeometry = BufferGeometryUtils.mergeGeometries([tubeGeometry, cap1, cap2]);
    const mesh = new THREE.Mesh(mergedGeometry, silver);

    return mesh;
}

function morseCodeToGeometries(morseCode, radius) {
    const geometries = [];
    let angle = 0;
    const angleIncrement = params.max_angle / morseCodeLength(morseCode);

    for (let char of morseCode) {
        if (char === '.') {
            // console.log('DOT');
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(params.morse_radius, Math.pow(2, params.quality), Math.pow(2, params.quality)),
                silver
            );
            sphere.position.x = Math.cos(angle + angleIncrement / 2.) * radius;
            sphere.position.y = Math.sin(angle + angleIncrement / 2.) * radius;
            geometries.push(sphere);
            angle += angleIncrement;
        } else if (char === '-') {
            // console.log('DASH')
            let offset = 2 * params.morse_radius / params.max_angle;
            const curvedCylinder = createCurvedCylinder(
                radius,
                params.morse_radius,
                angle + (0. + offset) * angleIncrement,
                angle + (3 - offset) * angleIncrement,
                Math.pow(2, params.quality)
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
        new THREE.TorusGeometry(params.major_radius, params.minor_radius, Math.pow(2, params.quality), Math.pow(2, params.quality + 2)),
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

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    time_el.innerHTML = params.morse_code + ': ' + params.morse_code_converted;



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
    gui.add(params, 'major_radius', 1, 20, 1).name('Major Radius').onChange(() => {
        add_ring();
    });
    gui.add(params, 'morse_radius', 0.1, 2, 0.01).name('Morse Radius').onChange(() => {
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
