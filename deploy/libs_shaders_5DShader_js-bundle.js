"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunkgranular_designs"] = self["webpackChunkgranular_designs"] || []).push([["libs_shaders_5DShader_js"],{

/***/ "./libs/shaders/5DShader.js":
/*!**********************************!*\
  !*** ./libs/shaders/5DShader.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   NDDEMShader: () => (/* binding */ NDDEMShader)\n/* harmony export */ });\n/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ \"./node_modules/three/build/three.module.js\");\n\n\nvar N = 5;\nvar uniforms = {\n  N: { value: N },\n  N_lines: { value: 5.0 },\n  //A: { value: new THREE.Matrix4() },\n  A: { value: [] }, // Size N*N\n  xview: { value: [] }, //Size N-3\n  xpart: { value: [] }, //Size N-3\n  // x4: { value: 0 },\n  // x4p: { value: 0 },\n  R: { value: 0.5 },\n  ambient: { value: 1.0 },\n  opacity: { value: 1.0 },\n};\n\nfor (var ij = 0; ij < N - 3; ij++) {\n  uniforms.xview.value[ij] = 0.0;\n  uniforms.xpart.value[ij] = 0.0;\n}\n// if (N > 3) {\n  // uniforms.x4.value = 0.0;\n// }\nfor (var ij = 0; ij < N * N; ij++) {\n  if (ij % N == Math.floor(ij / N)) uniforms.A.value[ij] = 1;\n  else uniforms.A.value[ij] = 0;\n}\n\nvar NDDEMShader = new three__WEBPACK_IMPORTED_MODULE_0__.ShaderMaterial({\n  uniforms: uniforms,\n\n  vertexShader: [\n    \"#define N 5\",\n    \"uniform float N_lines;\", // number of lines to render across particle\n    \"uniform float A[N*N];\", // orientation matrix for this particle\n    \"uniform float R;\", // particle radius\n    \"uniform float xview[N-3] ;\",\n    \"uniform float xpart[N-3] ;\",\n    \"varying vec3 vColor;\", // colour at vertex (output)\n    \"varying vec3 vNormal;\", // normal at vertex (output)\n    \"vec3 colors[4] ; //{0,1,1},{1,0,1}}\",\n    //colors[0] = vec3(1.,0.,0.) ;\n    \"vec3 colorscale = vec3(2.,2.,1.) ;\",\n    \"vec3 tmp ;\",\n    \"float x[N];\",\n    \"float x_rotated[N];\",\n    \"float phi[N-1];\",\n\n    \"bool isnan(float val)\",\n    \"{\",\n    \"return (val <= 0.0 || 0.0 <= val) ? false : true;\",\n    \"}\",\n\n    \"void main() {\",\n    \"colors[0]=vec3(1.,0.,0.) ;\",\n    \"colors[1]=vec3(0.,1.,0.) ;\",\n    \"colors[2]=vec3(0.,0.,1.) ;\",\n    \"colors[3]=vec3(1.,1.,0.) ;\",\n\n    \"vNormal = normal;\", // for directional lighting\n    \"const float pi = 3.14159265359;\",\n    \"float R_draw;\", // radius particle will be drawn at\n    \"float R_draw_squared = R*R ;\",\n    \"for (int i=0 ; i<N-3 ; i++)\",\n    \"R_draw_squared -= (xview[i] - xpart[i])*(xview[i] - xpart[i]);\",\n    \"if ( R_draw_squared > 0.0 ) {\", // only if visible\n    \"R_draw = sqrt(R_draw_squared);\",\n    // get 3d locations in x,y,z,w in coord system where center of sphere is at 0,0,0,0\n    \"x[1] = R_draw*cos((uv.y-0.5)*pi)*cos((uv.x-0.5)*2.0*pi);\",\n    \"x[2] = - R_draw*cos((uv.y-0.5)*pi)*sin((uv.x-0.5)*2.0*pi);\",\n    \"x[0] = - R_draw*sin((uv.y-0.5)*pi);\",\n\n    \"for (int i=0 ; i<N-3 ; i++)\",\n    \"x[i+3] = xview[i] - xpart[i];\",\n\n    // compute the rotated location by doing transpose(A) * x, with A the orientation matrix from the dumps\n    \"float rsqr = 0. ;\",\n    \"for (int i=0 ; i<N ; i++)\",\n    \"{\",\n    \"x_rotated[i] = 0. ;\",\n    \"for (int j=0 ; j<N ; j++)\",\n    \"x_rotated[i] += A[j*N+i]*x[j] ;\",\n    \"rsqr += x_rotated[i]*x_rotated[i] ;\",\n    \"}\",\n\n    // convert that new vector in hyperspherical coordinates (you can have a look at the hyperspherical_xtophi function in Tools.h)\n    \"tmp[0] = x_rotated[0] ;\",\n    \"tmp[1] = x_rotated[1] ;\",\n    \"tmp[2] = x_rotated[2] ;\",\n    \"for (int i=0 ; i<N-3 ; i++)\",\n    \"{\",\n    \"x_rotated[i] = x_rotated[i+3] ;\",\n    \"}\",\n    \"x_rotated[N-3] = tmp[0];\",\n    \"x_rotated[N-2] = tmp[1];\",\n    \"x_rotated[N-1] = tmp[2];\",\n\n    \"int lastnonzero = 0 ;\",\n    \"for (int j=N-1 ; j>=0 ; j--)\",\n    \"{\",\n    \"if (abs(x_rotated[j])>1e-6)\",\n    \"break ;\",\n    \"lastnonzero = j ;\",\n    \"}\",\n    /*for (int j=N-1 ; j>=0 && abs(x_rotated[j])<1e-6 ; j--)\n                    {\n                        lastnonzero = j ;\n                    }*/\n    \"lastnonzero-- ;\",\n\n    \"for (int i=0 ; i<N-1 ; i++)\",\n    \"{\",\n    \"if (i>=lastnonzero)\",\n    \"{\",\n    \"if (x_rotated[i]<0.) phi[i] = pi ;\",\n    \"else phi[i] = 0. ;\",\n    \"}\",\n\n    \"phi[i] = acos(x_rotated[i]/sqrt(rsqr)) ;\",\n    \"if (isnan(phi[i])) {phi[i]=pi ;}\",\n    \"rsqr -= x_rotated[i]*x_rotated[i] ;\",\n    \"}\",\n    \"if (x_rotated[N-1]<0.) phi[N-2] = 2.*pi - phi[N-2] ;\",\n\n    // Coloring\n    \"vColor.r = 0.0;\",\n    \"vColor.g = 0.0;\",\n    \"vColor.b = 0.0;\",\n\n    \"for (int i=0 ; i<N-2 ; i++)\",\n    \"{\",\n    \"vColor.r += (colors[i][0] * abs(sin(3.*phi[i])))/colorscale[0] ;\",\n    \"vColor.g += (colors[i][1] * abs(sin(3.*phi[i])))/colorscale[1] ;\",\n    \"vColor.b += (colors[i][2] * abs(sin(3.*phi[i])))/colorscale[2] ;\",\n    \"}\",\n    \"vColor.r += (colors[N-2][0] * abs(sin(4.*phi[N-2]/2.)))/colorscale[0] ;\",\n    \"vColor.g += (colors[N-2][1] * abs(sin(4.*phi[N-2]/2.)))/colorscale[1] ;\",\n    \"vColor.b += (colors[N-2][2] * abs(sin(4.*phi[N-2]/2.)))/colorscale[2] ;\",\n    \"for (int i=0 ; i<N-2 ; i++)\",\n    \"{\",\n    \"vColor.r *= abs(sin(phi[i])) ;\",\n    \"vColor.g *= abs(sin(phi[i])) ;\",\n    \"vColor.b *= abs(sin(phi[i])) ;\",\n    \"}\",\n    \"}\",\n    \"else { vColor.r = 0.0; }\",\n    \"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\",\n    \"}\",\n  ].join(\"\\n\"),\n\n  fragmentShader: [\n    \"uniform float ambient;\", // brightness of particle\n    \"uniform float opacity;\", // opacity of particle\n\n    \"varying vec3 vNormal;\",\n    \"varying vec3 vColor;\",\n\n    \"void main() {\",\n\n    // add directional lighting\n    // \"const float ambient = 1.0;\",\n    \"vec3 light = vec3( 1.0 );\",\n    \"light = normalize( light );\",\n    \"float directional = max( dot( vNormal, light ), 0.0 );\",\n    \"gl_FragColor = vec4( 0.6*( ambient + directional ) * vColor, opacity );\", // colours by vertex colour\n\n    // no directional lighting\n    // const float ambient = 1.0;\n    // gl_FragColor = vec4( ( ambient ) * vColor, 1.0 ); // colours by vertex colour\n\n    \"}\",\n  ].join(\"\\n\"),\n});\n\n\n\n\n//# sourceURL=webpack://granular-designs/./libs/shaders/5DShader.js?");

/***/ })

}]);