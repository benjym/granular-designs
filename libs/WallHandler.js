import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { PIDcontroller } from './PIDcontroller.js';
import { addition, subtraction } from './Mesh.js';
import font_file from '../resources/helvetiker_bold.typeface.json';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ExtrudeGeometry } from "./ExtrudeGeometry.js";

export let left, right, floor, roof, front, back;
export let axesHelper, arrow_x, arrow_y, arrow_z;
let arrow_body, arrow_head;
let textGeo_x, textGeo_y, textGeo_z;
// let font;

let vertical_wall_displacement = 0;

let walls;
export let ring = new THREE.Group();


var loader = new FontLoader();
// loader.load("../resources/helvetiker_bold.typeface.json", function (f) { font = f });
// console.log(font_file)
// loader.load(font_file, function (f) { font = f });
let font = loader.parse(font_file);

// let p_controller = new PIDcontroller(5e-4,1e-5,0);
// let q_controller = new PIDcontroller(5e-4,1e-5,0);
let p_controller = new PIDcontroller(1e-5, 5e-6, 0);
let q_controller = new PIDcontroller(1e-5, 5e-6, 0);

let damped_wall_controller = new PIDcontroller(1e-4, 1e-5, 0);
// let radial_controller = new PIDcontroller(1e-3,0,0);
// let y_controller = new PIDcontroller(1e-3,0,0);
// let z_controller = new PIDcontroller(1e-3,0,0);

// if ( params.dimension == 3 ) {
// p_controller = new PIDcontroller(1e-3,1e-5,1e-5);
// q_controller = new PIDcontroller(1e-3,1e-5,1e-5);
// }
// else {
// p_controller = new PIDcontroller(1e-7,1e-6,0);
// q_controller = new PIDcontroller(1e-6,1e-5,0);
// }

let box = new THREE.BoxGeometry(1, 1, 1);

const wall_geometry = new THREE.BoxGeometry(1, 1, 1);
export const wall_material = new THREE.MeshLambertMaterial();
wall_material.wireframe = true;
wall_material.wireframeLinewidth = 3;

const arrow_colour = 0xDDDDDD;
const arrow_material = new THREE.MeshLambertMaterial({ color: arrow_colour });

export function add_circle_wall(params, scene) {
    if (left !== undefined) { scene.remove(left); }
    const circle_geometry = new THREE.RingGeometry(params.R, params.R + params.thickness, 100, 1);
    left = new THREE.Mesh(circle_geometry, wall_material);
    left.rotation.x = Math.PI;
    scene.add(left);
}

export function remove_all_walls(scene) {
    let walls = [left, right, floor, roof, front, back];
    walls.forEach(wall => {
        if (wall !== undefined) { scene.remove(wall); }
    })
}

export function add_left(params, scene) {
    if (left !== undefined) { scene.remove(left); }
    left = new THREE.Mesh(wall_geometry, wall_material);
    left.scale.y = params.thickness;
    left.position.y = - params.L - params.thickness / 2.;
    // floor.receiveShadow = true;
    scene.add(left);
}

export function add_right(params, scene) {
    if (right !== undefined) { scene.remove(right); }
    right = new THREE.Mesh(wall_geometry, wall_material);
    right.scale.y = params.thickness;
    right.position.y = params.L + params.thickness / 2.;
    // top.receiveShadow = true;
    scene.add(right);
}

export function add_floor(params, scene) {
    if (floor !== undefined) { scene.remove(floor); }
    floor = new THREE.Mesh(wall_geometry, wall_material);
    floor.scale.y = params.thickness;
    floor.rotation.x = Math.PI / 2.;
    floor.position.z = - params.L * params.aspect_ratio - params.thickness / 2.;
    // left.receiveShadow = true;
    scene.add(floor);
}

export function add_roof(params, scene) {
    if (roof !== undefined) { scene.remove(roof); }
    roof = new THREE.Mesh(wall_geometry, wall_material);
    roof.scale.y = params.thickness;
    roof.rotation.x = Math.PI / 2.;
    roof.position.z = params.L * params.aspect_ratio + params.thickness / 2.;
    // right.receiveShadow = true;
    scene.add(roof);
}

export function add_front(params, scene) {
    if (front !== undefined) { scene.remove(front); }
    front = new THREE.Mesh(wall_geometry, wall_material);
    front.scale.y = params.thickness;
    front.rotation.z = Math.PI / 2.;
    front.position.x = params.L + params.thickness / 2.;
    // back.receiveShadow = true;
    scene.add(front);
}

export function add_back(params, scene) {
    if (back !== undefined) { scene.remove(back); }
    back = new THREE.Mesh(wall_geometry, wall_material);
    back.scale.y = params.thickness;
    back.rotation.z = Math.PI / 2.;
    back.position.x = -params.L - params.thickness / 2.;
    // front.receiveShadow = true;
    scene.add(back);
}

export function add_cuboid_walls(params, scene) {

    // const wall_geometry = new THREE.BoxGeometry( params.L*2 + params.thickness*2, params.thickness, params.L*2 + params.thickness*2 );
    // const wall_material = new THREE.ShadowMaterial( )

    add_left(params, scene);
    add_right(params, scene);
    add_floor(params, scene);
    add_roof(params, scene);
    add_front(params, scene);
    add_back(params, scene);

}

export function add_scale(params, scene) {
    var XYaxeslength = 2 * params.L - params.thickness / 2.; // length of axes vectors

    var fontsize = 0.1 * params.L; // font size
    var thickness = 0.02 * params.L; // line thickness

    if (axesHelper !== undefined) {
        scene.remove(axesHelper);
    } //else {}
    // if you haven't already made the axes

    axesHelper = new THREE.Group();
    scene.add(axesHelper);

    let arrow_body = new THREE.CylinderGeometry(
        thickness,
        thickness,
        XYaxeslength - 2 * thickness,
        Math.pow(2, params.quality),
        Math.pow(2, params.quality)
    );
    let arrow_head = new THREE.CylinderGeometry(
        0,
        2 * thickness,
        4 * thickness,
        Math.pow(2, params.quality),
        Math.pow(2, params.quality)
    );

    arrow_x = new THREE.Mesh(arrow_body, arrow_material);
    arrow_y = new THREE.Mesh(arrow_body, arrow_material);

    var arrow_head_x = new THREE.Mesh(arrow_head, arrow_material);
    var arrow_head_y = new THREE.Mesh(arrow_head, arrow_material);


    arrow_head_x.position.y = XYaxeslength / 2.;
    arrow_head_y.position.y = XYaxeslength / 2.;


    arrow_x.add(arrow_head_x);
    arrow_y.add(arrow_head_y);

    var textGeo_x = new TextGeometry(String((params.L * 1e3).toFixed(2)) + " mm", {
        font: font,
        size: fontsize,
        height: fontsize / 5,
    });
    var textMaterial_x = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    var mesh_x = new THREE.Mesh(textGeo_x, arrow_material);
    mesh_x.position.y = XYaxeslength / 2. - 6 * fontsize;
    mesh_x.position.x = 2 * fontsize;
    // mesh_x.position.z = fontsize / 4;
    mesh_x.rotation.z = Math.PI / 2;
    // mesh_x.rotation.y = Math.PI;
    // mesh_x.position.y = XYaxeslength/2.;
    arrow_x.add(mesh_x);

    var textGeo_y = new TextGeometry(String((params.L * 1e3).toFixed(2)) + " mm", {
        font: font,
        size: fontsize,
        height: fontsize / 5,
    });
    var textMaterial_y = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    var mesh_y = new THREE.Mesh(textGeo_y, arrow_material);
    // mesh_y.position.x = -0.15 * params.L;
    // mesh_y.position.y = XYaxeslength;// - fontsize*6;
    // mesh_y.position.z = fontsize / 4;
    // mesh_y.rotation.z = -Math.PI / 2;
    mesh_y.position.y = XYaxeslength / 2.;// - 6*fontsize;
    mesh_y.position.x = -2 * fontsize;
    mesh_y.rotation.z = -Math.PI / 2;
    arrow_y.add(mesh_y);

    arrow_x.position.x = XYaxeslength / 2 - 2 * thickness;
    arrow_x.rotation.z = -Math.PI / 2;

    arrow_y.position.y = XYaxeslength / 2 - 2 * thickness;
    axesHelper.add(arrow_x);
    axesHelper.add(arrow_y);
    // now the z axis
    var Zaxislength = params.L + params.L_cur - params.thickness / 2.
    var fontsize = 0.1 * params.L; // font size
    var thickness = 0.02 * params.L; // line thickness

    var arrow_body_z = new THREE.CylinderGeometry(
        thickness,
        thickness,
        Zaxislength - 4 * thickness,
        Math.pow(2, params.quality),
        Math.pow(2, params.quality)
    );
    arrow_z = new THREE.Mesh(arrow_body_z, arrow_material);
    var arrow_head_z = new THREE.Mesh(arrow_head, arrow_material);
    arrow_head_z.position.y = Zaxislength / 2;
    arrow_z.add(arrow_head_z);

    var textGeo_z = new TextGeometry(String((params.L_cur * 1e3).toFixed(2)) + " mm", {
        font: font,
        size: fontsize,
        height: fontsize / 5,
    });
    var textMaterial_z = new THREE.MeshLambertMaterial({ color: 0x0000ff });
    var mesh_z = new THREE.Mesh(textGeo_z, arrow_material);
    mesh_z.position.x = - 1.5 * fontsize;
    // mesh_z.position.y = fontsize / 4;
    mesh_z.position.y = Zaxislength / 2. - 6 * fontsize;// + 1.5 * fontsize;
    // mesh_z.rotation.z = -Math.PI / 2;
    mesh_z.rotation.z = Math.PI / 2;
    arrow_z.add(mesh_z);

    // arrow_z.scale.x = Zaxislength/XYaxeslength;
    arrow_z.position.z = Zaxislength / 2 - 2 * thickness;
    arrow_z.rotation.x = Math.PI / 2;


    axesHelper.add(arrow_z);

    axesHelper.position.set(params.L, params.L, -params.L); // move to bottom left hand corner
    axesHelper.rotation.z = Math.PI;
    // axesLabels.position.set(-params.L, params.L, -params.L); // move to bottom left hand corner
    // axesLabels.rotation.z = -Math.PI/2;
}

export function update_walls(params, S, dt = 0.001) {
    params.packing_fraction = (params.N * params.particle_volume) / Math.pow(params.L_cur - params.W_cur, params.dimension - 1) / (params.L_cur - params.H_cur) / Math.pow(2, params.dimension);
    // console.log(params.packing_fraction) // NOTE: STILL A BIT BUGGY!!!!

    if (params.loading_method == 'strain_controlled') {
        if (params.constant_volume) {
            params.L_cur = params.L * (1 - params.volumetric_strain);
            params.H_cur = params.L * params.axial_strain;
            params.W_cur = -(-Math.sqrt(params.L * params.L * params.L * (params.L - params.H_cur)) - params.H_cur * params.L + params.L * params.L) / (params.H_cur - params.L);
            // console.log(params.L_cur, params.H_cur, params.W_cur);

        }
        else {
            params.L_cur = params.L * (1 - params.volumetric_strain);
            params.H_cur = params.L * params.axial_strain;
            params.W_cur = 0;
        }


    }
    else if (params.loading_method == 'stress_controlled') {
        let delta_p = p_controller.update(params.pressure_set_pt, pressure, dt);
        let delta_q = q_controller.update(params.deviatoric_set_pt, shear, dt)
        // console.log(pressure)
        params.L_cur -= delta_p;
        params.H_cur += delta_q;

    }
    params.front = params.L_cur - params.W_cur;
    params.back = -params.L_cur + params.W_cur;
    params.left = -params.L_cur + params.W_cur;
    params.right = params.L_cur - params.W_cur;
    params.floor = -params.L_cur + params.H_cur;
    params.roof = params.L_cur - params.H_cur;

    S.simu_setBoundary(0, [params.back, params.front]); // Set location of the walls in x
    S.simu_setBoundary(1, [params.left, params.right]); // Set location of the walls in y
    S.simu_setBoundary(2, [params.floor, params.roof]); // Set location of the walls in z
    for (var j = 0; j < params.dimension - 3; j++) {
        S.simu_setBoundary(j + 3, [-params.L_cur, params.L_cur]); // Set location of the walls in z
    }
    back.position.x = params.back - params.thickness / 2.;
    front.position.x = params.front + params.thickness / 2.;
    left.position.y = params.left - params.thickness / 2.;
    right.position.y = params.right + params.thickness / 2.;
    floor.position.z = params.floor - params.thickness / 2.;
    roof.position.z = params.roof + params.thickness / 2.;

    var horiz_walls = [floor, roof];
    var vert_walls = [left, right, front, back];

    vert_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * params.L_cur + 2 * params.thickness;
        mesh.scale.z = 2 * (params.L_cur - params.H_cur) + 2 * params.thickness;
    });

    horiz_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * params.L_cur + 2 * params.thickness;
        mesh.scale.z = 2 * params.L_cur + 2 * params.thickness;
    });

}

export function update_triaxial_walls(params, S, dt = 1) {
    params.packing_fraction = (params.N * params.particle_volume) / Math.pow(params.L_cur - params.W_cur, params.dimension - 1) / (params.L_cur * params.aspect_ratio - params.H_cur) / Math.pow(2, params.dimension);
    // console.log(params.packing_fraction) // NOTE: STILL A BIT BUGGY!!!!

    if (params.consolidate_active) {
        let delta_p = p_controller.update(params.pressure_set_pt, params.current_pressure, dt);
        params.L_cur -= delta_p;

        // let delta_q = q_controller.update(0,params.current_shear,dt) // keep zero axial
        // params.H_cur += delta_q;
    }
    if (params.shear_active) {
        if (params.constant_volume) {
            params.H_cur += params.loading_rate * dt
            params.W_cur = params.L_cur - Math.sqrt(params.V_const / (params.L_cur - params.H_cur));
            // console.log(params.W_cur)
        } else {
            // constant pressure
            let delta_p = p_controller.update(params.pressure_set_pt, params.current_pressure, dt);
            params.W_cur -= delta_p;
            // strain controlled loading axially
            params.H_cur += params.loading_rate * dt
        }
    }

    // if ( params.consolidate_active || params.shear_active ) {
    params.front = params.L_cur - params.W_cur;
    params.back = -params.L_cur + params.W_cur;
    params.left = -params.L_cur + params.W_cur;
    params.right = params.L_cur - params.W_cur;
    params.floor = -params.L_cur * params.aspect_ratio + params.H_cur * params.aspect_ratio;
    params.roof = params.L_cur * params.aspect_ratio - params.H_cur * params.aspect_ratio;

    S.simu_setBoundary(0, [params.back, params.front]); // Set location of the walls in x
    S.simu_setBoundary(1, [params.left, params.right]); // Set location of the walls in y
    S.simu_setBoundary(2, [params.floor, params.roof]); // Set location of the walls in z
    for (var j = 0; j < params.dimension - 3; j++) {
        S.simu_setBoundary(j + 3, [-params.L_cur, params.L_cur]); // Set location of the walls in z
    }

    // and now tidy things up on the threejs side
    back.position.x = params.back - params.thickness / 2.;
    front.position.x = params.front + params.thickness / 2.;
    left.position.y = params.left - params.thickness / 2.;
    right.position.y = params.right + params.thickness / 2.;
    floor.position.z = params.floor - params.thickness / 2.;
    roof.position.z = params.roof + params.thickness / 2.;

    var horiz_walls = [floor, roof];
    var vert_walls = [left, right, front, back];

    vert_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * (params.L_cur - params.W_cur) + 2 * params.thickness;
        mesh.scale.z = 2 * (params.L_cur * params.aspect_ratio - params.H_cur) + 2 * params.thickness;
    });

    horiz_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * (params.L_cur - params.W_cur) + 2 * params.thickness;
        mesh.scale.z = 2 * (params.L_cur - params.W_cur) + 2 * params.thickness;
    });
    // }

}

export function update_top_wall(params, S, scene, dt = 0.001) {
    params.packing_fraction = (params.N * params.particle_volume) / Math.pow(params.L, params.dimension - 1) / (params.L_cur) / Math.pow(2, params.dimension) * 2;
    // console.log(params.packing_fraction) // NOTE: STILL A BIT BUGGY!!!!

    // params.L_cur =  params.L*(1-2*params.vertical_displacement);
    params.L_cur = params.L - params.vertical_displacement;
    params.roof = params.L_cur;// - params.H_cur;
    params.floor = -params.L;

    S.simu_setBoundary(0, [-params.L, params.L]); // Set location of the walls in x
    S.simu_setBoundary(1, [-params.L, params.L]); // Set location of the walls in y
    S.simu_setBoundary(2, [-params.L, params.roof]); // Set location of the walls in z
    roof.position.z = params.roof + params.thickness / 2.;
    floor.position.z = params.floor - params.thickness / 2.;

    var horiz_walls = [floor, roof];
    var vert_walls = [left, right, front, back];

    vert_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * params.L + 2 * params.thickness;
        mesh.scale.z = 2 * (params.L) + 2 * params.thickness;
    });

    horiz_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * params.L + 2 * params.thickness;
        mesh.scale.z = 2 * params.L + 2 * params.thickness;
    });

    if (axesHelper !== undefined) { add_scale(params, scene); }

}

export function update_damped_wall(current, target, params, S, dt, axis = 1) {
    let delta_L = damped_wall_controller.update(target, current, dt);
    vertical_wall_displacement += delta_L;
    let L_cur = params.L - vertical_wall_displacement;

    if (axis == 0 && params.aspect_ratio !== undefined) {
        S.simu_setBoundary(axis, [-L_cur * params.aspect_ratio, L_cur * params.aspect_ratio]); // Set location of the walls in y
    } else {
        S.simu_setBoundary(axis, [-L_cur, L_cur]); // Set location of the walls in y
    }

    // console.log(axis, L_cur, current, target);
}

export function update_isotropic_wall(params, S, scene, dt = 0.001) {
    //params.packing_fraction = (params.N*params.particle_volume)/Math.pow(params.L,params.dimension-1)/(params.L_cur)/Math.pow(2,params.dimension)*2;
    // console.log(params.packing_fraction) // NOTE: STILL A BIT BUGGY!!!!

    // params.L_cur =  params.L*(1-2*params.vertical_displacement);
    params.H_cur = (1 - params.epsilonv / 3.) * params.H;
    params.L_cur = (1 - params.epsilonv / 3.) * params.L;

    S.simu_setBoundary(0, [-params.L_cur, params.L_cur]); // Set location of the walls in x
    S.simu_setBoundary(1, [-params.L_cur, params.L_cur]); // Set location of the walls in y
    S.simu_setBoundary(2, [-params.H_cur, params.H_cur]); // Set location of the walls in z
    roof.position.z = params.roof + params.thickness / 2.;
    floor.position.z = params.floor - params.thickness / 2.;
    left.position.y = -params.L_cur;
    right.position.y = params.L_cur;
    front.position.x = params.L_cur;
    back.position.x = -params.L_cur;

    var horiz_walls = [floor, roof];
    var vert_walls = [left, right, front, back];

    vert_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * params.L_cur + 2 * params.thickness;
        mesh.scale.z = 2 * (params.H_cur) + 2 * params.thickness;
    });

    horiz_walls.forEach(function (mesh) {
        mesh.scale.x = 2 * params.L_cur;//+ 2*params.thickness;
        mesh.scale.z = 2 * params.L_cur;//+ 2*params.thickness;
    });

    if (!params.hideaxes && axesHelper !== undefined) { add_scale_isotropic(params, scene); }

}

export function add_scale_isotropic(params, scene) {
    var XYaxeslength = 2 * params.L_cur - params.thickness / 2.; // length of axes vectors

    var fontsize = 0.1 * params.L; // font size
    var thickness = 0.02 * params.L; // line thickness

    if (axesHelper !== undefined) {
        scene.remove(axesHelper);
    } //else {}
    // if you haven't already made the axes

    axesHelper = new THREE.Group();
    scene.add(axesHelper);

    let arrow_length = XYaxeslength - 2 * thickness;
    if (arrow_body === undefined) {
        arrow_body = new THREE.CylinderGeometry(
            thickness,
            thickness,
            1,
            Math.pow(2, params.quality),
            Math.pow(2, params.quality)
        );

        arrow_head = new THREE.CylinderGeometry(
            0,
            2 * thickness,
            4 * thickness,
            Math.pow(2, params.quality),
            Math.pow(2, params.quality)
        );
    }
    if (textGeo_x !== undefined) {
        textGeo_x.dispose();
        textGeo_y.dispose();
        textGeo_z.dispose();
    }

    arrow_x = new THREE.Group();
    arrow_y = new THREE.Group();

    let arrow_body_x = new THREE.Mesh(arrow_body, arrow_material);
    let arrow_body_y = new THREE.Mesh(arrow_body, arrow_material);
    arrow_body_x.scale.y = arrow_length;
    arrow_body_y.scale.y = arrow_length;


    arrow_x.add(arrow_body_x);
    arrow_y.add(arrow_body_y);

    var arrow_head_x = new THREE.Mesh(arrow_head, arrow_material);
    var arrow_head_y = new THREE.Mesh(arrow_head, arrow_material);


    arrow_head_x.position.y = XYaxeslength / 2.;
    arrow_head_y.position.y = XYaxeslength / 2.;


    arrow_x.add(arrow_head_x);
    arrow_y.add(arrow_head_y);

    textGeo_x = new TextGeometry(String((2 * params.L_cur * 1e3).toFixed(2)) + " mm", {
        font: font,
        size: fontsize,
        height: fontsize / 5,
    });
    var mesh_x = new THREE.Mesh(textGeo_x, arrow_material);
    mesh_x.position.y = XYaxeslength / 2. - 6 * fontsize;
    mesh_x.position.x = 2 * fontsize;
    // mesh_x.position.z = fontsize / 4;
    mesh_x.rotation.z = Math.PI / 2;
    // mesh_x.rotation.y = Math.PI;
    // mesh_x.position.y = XYaxeslength/2.;
    arrow_x.add(mesh_x);

    textGeo_y = new TextGeometry(String((2 * params.L_cur * 1e3).toFixed(2)) + " mm", {
        font: font,
        size: fontsize,
        height: fontsize / 5,
    });
    var mesh_y = new THREE.Mesh(textGeo_y, arrow_material);
    mesh_y.position.y = XYaxeslength / 2.;// - 6*fontsize;
    mesh_y.position.x = -2 * fontsize;
    mesh_y.rotation.z = -Math.PI / 2;
    arrow_y.add(mesh_y);

    arrow_x.position.x = XYaxeslength / 2 - 2 * thickness;
    arrow_x.rotation.z = -Math.PI / 2;

    arrow_y.position.y = XYaxeslength / 2 - 2 * thickness;
    axesHelper.add(arrow_x);
    axesHelper.add(arrow_y);
    // now the z axis
    var Zaxislength = 2 * params.H_cur - params.thickness / 2.
    var fontsize = 0.1 * params.L; // font size
    var thickness = 0.02 * params.L; // line thickness

    // var arrow_body_z = new THREE.CylinderGeometry(
    //   thickness,
    //   thickness,
    //   Zaxislength - 4*thickness,
    //   Math.pow(2, params.quality),
    //   Math.pow(2, params.quality)
    // );
    let arrow_body_z = new THREE.Mesh(arrow_body, arrow_material);
    arrow_body_z.scale.y = Zaxislength - 4 * thickness;
    var arrow_head_z = new THREE.Mesh(arrow_head, arrow_material);
    arrow_head_z.position.y = Zaxislength / 2;

    arrow_z = new THREE.Group();
    arrow_z.add(arrow_body_z);
    arrow_z.add(arrow_head_z);

    textGeo_z = new TextGeometry(String((2 * params.H_cur * 1e3).toFixed(2)) + " mm", {
        font: font,
        size: fontsize,
        height: fontsize / 5,
    });
    //var textMaterial_z = new THREE.MeshLambertMaterial({ color: 0x0000ff });
    var mesh_z = new THREE.Mesh(textGeo_z, arrow_material);
    mesh_z.position.x = - 1.5 * fontsize;
    // mesh_z.position.y = fontsize / 4;
    mesh_z.position.y = Zaxislength / 2. - 6 * fontsize;// + 1.5 * fontsize;
    // mesh_z.rotation.z = -Math.PI / 2;
    mesh_z.rotation.z = Math.PI / 2;
    arrow_z.add(mesh_z);

    // arrow_z.scale.x = Zaxislength/XYaxeslength;
    arrow_z.position.z = Zaxislength / 2 - 2 * thickness;
    arrow_z.rotation.x = Math.PI / 2;


    axesHelper.add(arrow_z);

    axesHelper.position.set(params.L_cur, params.L_cur, -params.H_cur); // move to bottom left hand corner
    axesHelper.rotation.z = Math.PI;
    // axesLabels.position.set(-params.L, params.L, -params.L); // move to bottom left hand corner
    // axesLabels.rotation.z = -Math.PI/2;
}


export function createWalls(scene) {
    if (walls !== undefined) { scene.remove(walls); }
    walls = new THREE.Object3D();
    for (let d = 0; d < 3; d++) {
        walls.add(new THREE.Mesh(box, wall_material));
        walls.add(new THREE.Mesh(box, wall_material));
    }
    scene.add(walls);
}

export function update(params) {
    if (walls !== undefined) {
        for (let d = 0; d < 3; d++) {
            if (params['boundary' + d].type === 'WALL') {
                for (let i = 0; i < 2; i++) {
                    walls.children[2 * d + i].visible = true;
                    walls.children[2 * d + i].scale.set(
                        (d !== 0) * (params.boundary0.max - params.boundary0.min),
                        (d !== 1) * (params.boundary1.max - params.boundary1.min),
                        (d !== 2) * (params.boundary2.max - params.boundary2.min));
                }
                walls.children[2 * d].position.setComponent(d, params['boundary' + d].min);
                walls.children[2 * d + 1].position.setComponent(d, params['boundary' + d].max);
            }
            else {
                walls.children[2 * d].visible = false;
                walls.children[2 * d + 1].visible = false;
            }
        }
    }
}

export function toggle_ring_walls(params) {
    if (ring !== undefined && ring.parent) {
        let scene = ring.parent;
        scene.remove(ring);
        HollowCylinder(params).then(ring => {
            scene.add(ring);
            if (params.wall) {
                ring.visible = true;
            } else {
                ring.visible = false;
            }
        });
    }
    if (walls !== undefined) {
        for (let d = 0; d < 3; d++) {
            if (params.boundary[d].type === 'WALL') {
                let linear_thickness = 0.1;
                for (let i = 0; i < 1; i++) { // just first wall for ring!
                    walls.children[2 * d + i].visible = true;
                    walls.children[2 * d + i].scale.set(
                        (d !== 0) * params.boundary[0].range + (d == 0) * linear_thickness,
                        (d !== 1) * params.boundary[1].range + (d == 1) * linear_thickness,
                        (d !== 2) * params.boundary[2].range + (d == 2) * linear_thickness
                    );
                }
                walls.children[2 * d + 1].visible = false;
                for (let i = 0; i < 3; i++) {
                    if (i !== d) {
                        walls.children[2 * d].position.setComponent(i, (params.boundary[i].min + params.boundary[i].max) / 2);
                    }
                    else {
                        walls.children[2 * d].position.setComponent(d, params.boundary[d].min - linear_thickness / 2.);
                        walls.children[2 * d + 1].position.setComponent(d, params.boundary[d].max + linear_thickness / 2.);
                    }
                }
                // if (params.wall) {
                //     ring.scale.set(
                //         (params.boundary[0].max - params.boundary[0].min) + params.thickness,
                //         (params.boundary[1].max - params.boundary[1].min) + params.thickness,
                //         (params.boundary[2].max - params.boundary[2].min) + params.thickness
                //     );
                //     ring.position.set(
                //         (params.boundary[0].max + params.boundary[0].min) / 2,
                //         (params.boundary[1].max + params.boundary[1].min) / 2,
                //         (params.boundary[2].max + params.boundary[2].min) / 2
                //     );
                // }
            }
            else {
                walls.children[2 * d].visible = false;
                walls.children[2 * d + 1].visible = false;
            }
        }
    }
}

export async function HollowCylinder(params) {

    // Create a ring shape
    var outerRadius = params.R_0;
    var innerRadius = params.R_finger;
    let depth = params.boundary[2].range * params.R_0 * 2 / params.boundary[0].range;
    let material = new THREE.MeshLambertMaterial({ color: 0x666666, side: THREE.DoubleSide });
    // material.wireframe = true;

    let geometry;
    if (params.shank.type == 'cylinder') {
        var shape = new THREE.Shape();
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, true);
        let hole = new THREE.Path();
        hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, false);
        shape.holes.push(hole);

        depth = params.T;
        let bevel = 0.5;//params.thickness / 2.
        // Extrude the shape
        var extrudeSettings = {
            depth: depth,
            // bevelEnabled: false,
            bevelEnabled: true,
            bevelThickness: bevel,
            bevelSize: bevel,
            bevelOffset: -bevel,
            bevelSegments: 20,
            curveSegments: Math.pow(2, params.quality + 1), // higher because its big
        };
        geometry = new ExtrudeGeometry(shape, extrudeSettings);
        ring = new THREE.Mesh(geometry, material);
        // hole = new THREE.CylinderGeometry(innerRadius, innerRadius, depth, 32);
    } else if (params.shank.type === 'protruding') {
        let height = params.shank.height * params.R_0;

        let radius = params.R_0;
        let make_with_extrude = true;
        // var width = 2 * radius; // Width of the flat top part is twice the radius
        if (make_with_extrude) {
            var shape = new THREE.Shape();
            // Start from the top left corner
            shape.moveTo(-radius, 0);

            // Draw the top horizontal line to the right corner
            shape.lineTo(radius, 0);

            // Draw the right vertical line down
            shape.lineTo(radius, -height);

            // Draw the bottom semicircle
            shape.absarc(0, -height, radius, 0, Math.PI, true);

            // Draw the left vertical line up to close the shape
            shape.lineTo(-radius, 0);

            // Now you can use this shape to create geometry
            geometry = new THREE.ShapeGeometry(shape);

            let hole = new THREE.Path();
            hole.moveTo(-innerRadius, 0);
            hole.absarc(0, -height, innerRadius, 0, Math.PI * 2, false);
            shape.holes.push(hole);

            let bevel = 0.5;//params.thickness / 2.
            // Extrude the shape
            var extrudeSettings = {
                depth: depth,
                // bevelEnabled: false,
                bevelEnabled: true,
                bevelThickness: bevel,
                bevelSize: bevel,
                bevelOffset: -bevel,
                bevelSegments: 10,
                curveSegments: Math.pow(2, params.quality + 1), // higher because its big
                // bevelSegments: 3,
                // curveSegments: 10
            };
            geometry = new ExtrudeGeometry(shape, extrudeSettings);
            ring = new THREE.Mesh(geometry, material);
        }
        else {
            let outer_ring = new THREE.CylinderGeometry(outerRadius, outerRadius, depth, Math.pow(2, params.quality + 0));
            outer_ring.rotateX(Math.PI / 2);
            outer_ring.translate(0, -height, depth / 2);

            let hole = new THREE.CylinderGeometry(innerRadius, innerRadius, depth * 2, Math.pow(2, params.quality + 0));
            hole.rotateX(Math.PI / 2);
            hole.translate(0, -height, depth / 2);

            // let shoulder_geom = new THREE.BoxGeometry(2 * outerRadius, height, depth);
            let box_radius = 0.4;
            let shoulder_geom_top = new RoundedBoxGeometry(2 * outerRadius, 2 * height / 3., depth, 5, box_radius);
            let shoulder_geom_bot = new THREE.BoxGeometry(2 * outerRadius, 2 * height / 3., depth);
            shoulder_geom_top.translate(0, height / 6, 0);
            shoulder_geom_bot.translate(0, -height / 6, 0);
            addition(shoulder_geom_top, shoulder_geom_bot, material).then((r) => {
                let shoulder_geom = r.geometry;

                shoulder_geom.translate(0, -height / 2, depth / 2);

                // let outer = new THREE.Mesh(outer_ring, material);
                // let inner = new THREE.Mesh(hole, wall_material);
                // let shoulder = new THREE.Mesh(shoulder_geom, material);
                params.cutOffAngle = 45;
                params.tryKeepNormals = true;

                addition(outer_ring, shoulder_geom, material).then((res) => {
                    subtraction(res.geometry, hole, material).then((res2) => {
                        ring.add(res2);
                    });
                });
            });


        }
    }

    // console.log(geometry)

    // difference(geometry, hole).then((res) => {
    //     // console.log(res)
    //     ring.add(new THREE.Mesh(geometry, material));
    // });



    if (params.shank.gravity_tag && params.shank.type === 'protruding') {
        let g = new THREE.Group();

        let text = new THREE.Mesh(
            new TextGeometry('g', { font: font, size: params.shank.fontsize, height: 0.25 * params.shank.fontsize }),
            new THREE.MeshBasicMaterial({ color: 0x666666 })
        )
        g.add(text);

        const arrow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 * params.shank.fontsize, 0.2 * params.shank.fontsize, 5 * params.shank.fontsize, 32),
            new THREE.MeshLambertMaterial({ color: 0x666666 })
        );
        let arrow_head = new THREE.Mesh(
            new THREE.ConeGeometry(0.5 * params.shank.fontsize, 2 * params.shank.fontsize, 32),
            new THREE.MeshLambertMaterial({ color: 0x666666 })
        );
        arrow_head.position.y = -2.5 * params.shank.fontsize;
        arrow_head.rotateZ(Math.PI);
        arrow.add(arrow_head);
        arrow.position.x = 1.5 * params.shank.fontsize;
        arrow.position.y = -0.5 * params.shank.fontsize;
        arrow.rotateZ(-Math.PI * (90 - params.theta) / 180);

        g.add(arrow);

        g.position.x = -0.85 * params.R_0;
        g.position.y = -0.25 * params.R_0;
        g.position.z = depth + 0.5 * params.shank.fontsize;



        // g.position.z = 0.75 * params.shank.fontsize;

        // g.position.z = -0.5 * depth;
        ring.add(g);

    }

    return ring;
}