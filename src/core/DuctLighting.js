/**
 * [ROLE] Makes sealed interior volumes -- ducts, crawlspaces, vent tunnels -- reject the
 *        scene-wide ambient bounce while still taking the flashlight and any fixture spilling
 *        through an open grate at full strength.
 * [WHY] A sealed duct receives no bounced light because of what it is, not because of who is
 *       standing in it. Keying the darkness off `player.isCrawling` and zeroing the global
 *       ambient got both halves wrong: it darkened the entire scene rather than the duct, and it
 *       fired on entry rather than on sight, so the duct looked fully lit until the player
 *       climbed in and then faded to black.
 * [WHY-NOT-LAYERS] The obvious fix -- put duct geometry on its own render layer and exclude the
 *       ambient light from it -- does not work in three.js r160. Lights are gathered once per
 *       scene render (WebGLRenderer calls currentRenderState.setupLights() a single time) and
 *       filtered only by `object.layers.test(camera.layers)`; there is no test of a light's
 *       layers against an individual mesh anywhere in the render path. Ambient and hemisphere
 *       contributions then reach the shader as the global `ambientLightColor` and
 *       `hemisphereLights` uniforms, summed unconditionally into `irradiance` for every fragment
 *       of every lit material. Light layers cannot exclude a mesh from ambient. Verified against
 *       r160.js in this repo, not assumed.
 * [HOW] Ambient occlusion has exactly the semantics needed and is applied per material. The
 *       aomap_fragment chunk is:
 *           ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
 *           reflectedLight.indirectDiffuse *= ambientOcclusion;
 *       It multiplies indirect diffuse only. Direct light from point and spot lights lands in
 *       reflectedLight.directDiffuse and is untouched, so the flashlight reads at full strength
 *       inside a duct while ambient does not reach it at all.
 * [STATE] Holds one lazily-built 1x1 texture shared by every duct material.
 * [DEPENDS] THREE.js MeshStandardMaterial aoMap / aoMapIntensity.
 */

/**
 * Fraction of the surrounding ambient a sealed duct interior still receives. This is the tuning
 * knob for how much work the flashlight has to do. 0 is pure black, which tends to read as a
 * rendering fault rather than a dark space -- a little irradiance keeps the silhouette legible.
 * Because AO scales whatever ambient is present, a duct in a bright wing stays proportionally
 * brighter than one in a blacked-out wing with no per-frame work.
 */
export const DUCT_AMBIENT_FRACTION = 0.02;

let blackAoTexture = null;

/**
 * A 1x1 black pixel. aomap_fragment reads only the red channel, so r=0 reduces the AO term to
 * (1 - aoMapIntensity) everywhere -- aoMapIntensity becomes a direct "how much ambient to
 * remove" dial with no texture authoring and no second UV set. Texture.channel defaults to 0,
 * which maps to the standard `uv` attribute, so existing box geometry works unchanged.
 */
function getBlackAoTexture() {
    if (blackAoTexture === null) {
        blackAoTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
        blackAoTexture.needsUpdate = true;
    }
    return blackAoTexture;
}

/**
 * Marks a material as a duct interior surface: ambient stops reaching it, direct light does not.
 *
 * Apply this only to surfaces that are duct interior and nothing else. Most structural blocks in
 * these blueprints are dual-faced -- the inward face lines the duct, the outward face is corridor
 * wall -- and a material applies to the whole mesh, so darkening one would punch a dark patch
 * into the corridor around the grate. The thin interior linings exist for exactly this reason.
 */
export function makeDuctInterior(mat) {
    if (!mat) return mat;
    mat.aoMap = getBlackAoTexture();
    mat.aoMapIntensity = 1.0 - DUCT_AMBIENT_FRACTION;
    /** [WHY] Emissive is added after the AO term and is not occluded by it, so any self-lit
     * material would keep glowing inside an otherwise dark duct and undo the effect. */
    if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0.0;
    mat.userData = Object.assign({}, mat.userData, {ductInterior: true});
    mat.needsUpdate = true;
    return mat;
}

/**
 * True when a material was authored as a duct interior surface.
 */
export function isDuctMaterial(mat) {
    if (!mat) return false;
    if (Array.isArray(mat)) {
        return mat.length > 0 && !!(mat[0].userData && mat[0].userData.ductInterior);
    }
    return !!(mat.userData && mat.userData.ductInterior);
}
