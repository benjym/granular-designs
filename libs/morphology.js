function getIndex(x, y, z, width, height) {
    return z * width * height + y * width + x;
}

function isWithinBounds2D(x, y, width, height) {
    return x >= 0 && x < width && y >= 0 && y < height;
}

function isWithinBounds3D(x, y, z, width, height, depth) {
    return x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < depth;
}

export function erode3D(array, width, height, depth, kernel) {
    let kWidth = kernel[0][0].length;
    let kHeight = kernel[0].length;
    let kDepth = kernel.length;
    let kCenterX = Math.floor(kWidth / 2);
    let kCenterY = Math.floor(kHeight / 2);
    let kCenterZ = Math.floor(kDepth / 2);
    let output = new Uint8Array(array.length);

    for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let isEroded = false;

                for (let kz = 0; kz < kDepth; kz++) {
                    for (let ky = 0; ky < kHeight; ky++) {
                        for (let kx = 0; kx < kWidth; kx++) {
                            if (kernel[kz][ky][kx] === 0) continue;

                            let pz = z + kz - kCenterZ;
                            let py = y + ky - kCenterY;
                            let px = x + kx - kCenterX;

                            if (isWithinBounds3D(px, py, pz, width, height, depth)) {
                                if (array[getIndex(px, py, pz, width, height)] === 0) {
                                    isEroded = true;
                                    break;
                                }
                            }
                        }
                        if (isEroded) break;
                    }
                    if (isEroded) break;
                }

                output[getIndex(x, y, z, width, height)] = isEroded ? 0 : array[getIndex(x, y, z, width, height)];
            }
        }
    }

    return output;
}

export function dilate3D(array, width, height, depth, kernel) {
    let kWidth = kernel[0][0].length;
    let kHeight = kernel[0].length;
    let kDepth = kernel.length;
    let kCenterX = Math.floor(kWidth / 2);
    let kCenterY = Math.floor(kHeight / 2);
    let kCenterZ = Math.floor(kDepth / 2);
    let output = new Uint8Array(array.length);

    for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let isDilated = false;

                for (let kz = 0; kz < kDepth; kz++) {
                    for (let ky = 0; ky < kHeight; ky++) {
                        for (let kx = 0; kx < kWidth; kx++) {
                            if (kernel[kz][ky][kx] === 0) continue;

                            let pz = z + kz - kCenterZ;
                            let py = y + ky - kCenterY;
                            let px = x + kx - kCenterX;

                            if (isWithinBounds3D(px, py, pz, width, height, depth)) {
                                if (array[getIndex(px, py, pz, width, height)] === 1) {
                                    isDilated = true;
                                    break;
                                }
                            }
                        }
                        if (isDilated) break;
                    }
                    if (isDilated) break;
                }

                output[getIndex(x, y, z, width, height)] = isDilated ? 1 : array[getIndex(x, y, z, width, height)];
            }
        }
    }

    return output;
}

export function open3D(array, width, height, depth, kernel) {
    return dilate3D(erode3D(array, width, height, depth, kernel), width, height, depth, kernel);
}

export function close3D(array, width, height, depth, kernel) {
    return erode3D(dilate3D(array, width, height, depth, kernel), width, height, depth, kernel);
}

export function erode2D(array, width, height, depth, kernel) {
    let kWidth = kernel[0].length;
    let kHeight = kernel.length;
    let kCenterX = Math.floor(kWidth / 2);
    let kCenterY = Math.floor(kHeight / 2);
    let output = new Uint8Array(array.length);

    for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let minVal = 255; // Maximum possible grayscale value

                for (let ky = 0; ky < kHeight; ky++) {
                    for (let kx = 0; kx < kWidth; kx++) {
                        if (kernel[ky][kx] === 0) continue;

                        let py = y + ky - kCenterY;
                        let px = x + kx - kCenterX;

                        if (isWithinBounds2D(px, py, width, height)) {
                            let val = array[getIndex(px, py, z, width, height)];
                            minVal = Math.min(minVal, val);
                        }
                    }
                }

                output[getIndex(x, y, z, width, height)] = minVal;
            }
        }
    }

    return output;
}

export function dilate2D(array, width, height, depth, kernel) {
    let kWidth = kernel[0].length;
    let kHeight = kernel.length;
    let kCenterX = Math.floor(kWidth / 2);
    let kCenterY = Math.floor(kHeight / 2);
    let output = new Uint8Array(array.length);

    for (let z = 0; z < depth; z++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let maxVal = 0; // Minimum possible grayscale value

                for (let ky = 0; ky < kHeight; ky++) {
                    for (let kx = 0; kx < kWidth; kx++) {
                        if (kernel[ky][kx] === 0) continue;

                        let py = y + ky - kCenterY;
                        let px = x + kx - kCenterX;

                        if (isWithinBounds2D(px, py, width, height)) {
                            let val = array[getIndex(px, py, z, width, height)];
                            maxVal = Math.max(maxVal, val);
                        }
                    }
                }

                output[getIndex(x, y, z, width, height)] = maxVal;
            }
        }
    }

    return output;
}

export function open2D(array, width, height, depth, kernel) {
    return dilate2D(erode2D(array, width, height, depth, kernel), width, height, depth, kernel);
}

export function close2D(array, width, height, depth, kernel) {
    return erode2D(dilate2D(array, width, height, depth, kernel), width, height, depth, kernel);
}