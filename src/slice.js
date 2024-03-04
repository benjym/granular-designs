import css from "../css/main.css";
import model from "../resources/stent.nrrd";
import t1 from "../resources/cm_viridis.png";
import t2 from "../resources/cm_gray.png";
import * as MORPH from "../libs/morphology.js";

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NRRDLoader } from 'three/addons/loaders/NRRDLoader.js';
import { VolumeRenderShader1 } from 'three/addons/shaders/VolumeShader.js';
import WebGL from 'three/addons/capabilities/WebGL.js';

if (WebGL.isWebGL2Available() === false) {

    document.body.appendChild(WebGL.getWebGL2ErrorMessage());

}

let renderer,
    scene,
    camera,
    controls,
    material,
    volconfig,
    cmtextures,
    vol,
    mesh;

let params = {
    slice: [
        { val: 300, delta: 10 }
    ],
    morph: 'none',
    kernel_width: 1,
    binning: 2
};

init();

function init() {

    scene = new THREE.Scene();

    // Create renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    let container = document.getElementById('canvas');
    container.appendChild(renderer.domElement);

    // Create camera (The volume renderer does not work very well with perspective yet)
    const h = 4; // frustum height
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(- h * aspect / 2, h * aspect / 2, h / 2, - h / 2, 0.01, 10);
    // camera.up.set(-1, 0, 0); // In our data, -x is up

    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);
    controls.target.set(0, 0, 0);
    // controls.target.set(volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5)
    // controls.minZoom = 0.5;
    // controls.maxZoom = 4;
    // controls.enablePan = false;
    controls.update();

    // Lighting is baked into the shader a.t.m.
    // let dirLight = new DirectionalLight( 0xffffff );

    // The gui for interaction
    volconfig = { clim1: 0, clim2: 1, renderstyle: 'iso', isothreshold: 0.4, colormap: 'viridis' };
    const gui = new GUI();
    const volfol = gui.addFolder('Volume rendering');
    volfol.add(volconfig, 'clim1', 0, 1, 0.01).onChange(updateUniforms);
    volfol.add(volconfig, 'clim2', 0, 1, 0.01).onChange(updateUniforms);
    volfol.add(volconfig, 'colormap', { gray: 'gray', viridis: 'viridis' }).onChange(updateUniforms);
    volfol.add(volconfig, 'renderstyle', { mip: 'mip', iso: 'iso' }).onChange(updateUniforms);
    volfol.add(volconfig, 'isothreshold', 0, 1, 0.01).onChange(updateUniforms);
    const slicefol = gui.addFolder('Slice');
    slicefol.add(params.slice[0], 'val', 0, 1000).onChange(show_slice);
    slicefol.add(params.slice[0], 'delta', 0, 50, 1).onChange(show_slice);
    slicefol.add(params, 'morph', ['open2D', 'close2D', 'dilate2D', 'erode2D', 'none']).onChange(show_slice);
    slicefol.add(params, 'kernel_width', 1, 10, 1).onChange(show_slice);

    // Load the data ...
    new NRRDLoader().load(model, function (volume) {
        if (volume.data instanceof Float32Array) {
            let data = new Uint8Array(volume.data.length);
            for (let i = 0; i < volume.data.length; i++) {
                data[i] = volume.data[i] * 255.0;
            }
            volume.data = data;
        }

        vol = volume;

        show_slice();

        render();


    });

    window.addEventListener('resize', onWindowResize);

}

function show_slice() {
    if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
    }
    // Texture to hold the volume. We have scalars, so we put our data in the red channel.
    // THREEJS will select R32F (33326) based on the THREE.RedFormat and THREE.FloatType.
    // Also see https://www.khronos.org/registry/webgl/specs/latest/2.0/#TEXTURE_TYPES_FORMATS_FROM_DOM_ELEMENTS_TABLE
    // TODO: look the dtype up in the volume metadata
    let this_data = extractSubarray(vol.data, vol.xLength, vol.yLength, vol.zLength, params.slice[0].val - params.slice[0].delta, params.slice[0].val + params.slice[0].delta);

    console.log('performing ' + params.morph + ' with kernel width ' + params.kernel_width + '...');
    // let kernel = [[[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]]];
    let kernel = generateVonNeumannKernel(params.kernel_width);
    console.log(kernel);
    if (params.morph === 'open3D') {
        this_data = MORPH.open3D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else if (params.morph === 'close3D') {
        this_data = MORPH.close3D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else if (params.morph === 'dilate3D') {
        this_data = MORPH.dilate3D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else if (params.morph === 'erode3D') {
        this_data = MORPH.erode3D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else if (params.morph === 'open2D') {
        this_data = MORPH.open2D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else if (params.morph === 'close2D') {
        this_data = MORPH.close2D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else if (params.morph === 'dilate2D') {
        this_data = MORPH.dilate2D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else if (params.morph === 'erode2D') {
        this_data = MORPH.erode2D(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength, kernel);
    } else {
        console.log('...unknown morphological operation ' + params.morph + '...');
    }

    console.log(' done')

    const texture = new THREE.Data3DTexture(this_data, 2 * params.slice[0].delta + 1, vol.yLength, vol.zLength);
    texture.format = THREE.RedFormat;
    // texture.type = THREE.FloatType;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;

    // Colormap textures
    cmtextures = {
        viridis: new THREE.TextureLoader().load(t1, render),
        gray: new THREE.TextureLoader().load(t2, render)
    };

    // Material
    const shader = VolumeRenderShader1;

    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['u_data'].value = texture;
    uniforms['u_size'].value.set(2 * params.slice[0].delta + 1, vol.yLength, vol.zLength);
    uniforms['u_clim'].value.set(volconfig.clim1, volconfig.clim2);
    uniforms['u_renderstyle'].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
    uniforms['u_renderthreshold'].value = volconfig.isothreshold; // For ISO renderstyle
    uniforms['u_cmdata'].value = cmtextures[volconfig.colormap];

    material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        side: THREE.BackSide // The volume shader uses the backface as its "reference point"
    });
    const geometry = new THREE.BoxGeometry(2 * params.slice[0].delta + 1, vol.yLength, vol.zLength);
    geometry.translate(params.slice[0].delta - 0.5, vol.yLength / 2 - 0.5, vol.zLength / 2 - 0.5); // no idea what is going on here... something necessary for the shader?

    mesh = new THREE.Mesh(geometry, material);
    // const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide }));
    mesh.scale.set(1. / vol.xLength, 1. / vol.xLength, 1. / vol.xLength);
    mesh.position.set(-0.5, -0.5, -0.5);
    scene.add(mesh);
}

function updateUniforms() {

    material.uniforms['u_clim'].value.set(volconfig.clim1, volconfig.clim2);
    material.uniforms['u_renderstyle'].value = volconfig.renderstyle == 'mip' ? 0 : 1; // 0: MIP, 1: ISO
    material.uniforms['u_renderthreshold'].value = volconfig.isothreshold; // For ISO renderstyle
    material.uniforms['u_cmdata'].value = cmtextures[volconfig.colormap];

    render();

}

function onWindowResize() {

    renderer.setSize(window.innerWidth, window.innerHeight);

    const aspect = window.innerWidth / window.innerHeight;

    const frustumHeight = camera.top - camera.bottom;

    camera.left = - frustumHeight * aspect / 2;
    camera.right = frustumHeight * aspect / 2;

    camera.updateProjectionMatrix();

    render();

}

function render() {

    renderer.render(scene, camera);

}

function extractSubarray(flatArray, nx, ny, nz, x_m, x_M) {
    const subNx = x_M - x_m + 1;
    const totalElements = subNx * ny * nz;
    const result = new Uint8Array(totalElements);

    let resultIndex = 0;
    for (let z = 0; z < nz; z++) {
        for (let y = 0; y < ny; y++) {
            for (let x = x_m; x <= x_M; x++) {
                const originalIndex = x + nx * (y + ny * z);
                result[resultIndex++] = flatArray[originalIndex];
            }
        }
    }

    return result;
}

function generateVonNeumannKernel(width) {
    let size = 2 * width + 1; // Total size of the kernel
    let kernel = new Array(size).fill(0).map(() =>
        new Array(size).fill(0).map(() => new Array(size).fill(0)));

    let mid = width; // Middle index

    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Calculate Manhattan distance from the center
                let distance = Math.abs(x - mid) + Math.abs(y - mid) + Math.abs(z - mid);
                kernel[z][y][x] = distance <= width ? 1 : 0;
            }
        }
    }

    return kernel;
}