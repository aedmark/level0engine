export const DUCT_AMBIENT_FRACTION = 0.02;

let blackAoTexture = null;

function getBlackAoTexture() {
    if (blackAoTexture === null) {
        blackAoTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
        blackAoTexture.needsUpdate = true;
    }
    return blackAoTexture;
}

export function makeDuctInterior(mat) {
    if (!mat) return mat;
    mat.aoMap = getBlackAoTexture();
    mat.aoMapIntensity = 1.0 - DUCT_AMBIENT_FRACTION;
    if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.0;
    mat.userData = Object.assign({}, mat.userData, {ductInterior: true});
    mat.needsUpdate = true;
    return mat;
}

export function isDuctMaterial(mat) {
    if (!mat) return false;
    if (Array.isArray(mat)) {
        return mat.length > 0 && !!(mat[0].userData && mat[0].userData.ductInterior);
    }
    return !!(mat.userData && mat.userData.ductInterior);
}
