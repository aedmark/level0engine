/**
 * [ROLE] Defines the render layer that isolates sealed interior volumes -- ducts, crawlspaces,
 *        vent tunnels -- from the scene-wide ambient bounce light.
 * [WHY] Ambient is a single global HemisphereLight. Driving it to zero to sell "this space is
 *       dark" darkens the entire visible world, including the lit room still visible through an
 *       open grate, and keying that off `player.isCrawling` made it fire on entry rather than on
 *       sight: the duct read as fully lit until the player climbed in, then faded to black.
 *       A sealed duct receives no bounced light because of what it is, not because of who is in
 *       it, so the darkness belongs on the geometry. With it there, entering a duct changes
 *       nothing -- there is no transition left to notice.
 * [STATE] Stateless constants and helpers.
 * [DEPENDS] THREE.js Object3D.layers / Raycaster.layers.
 */

/**
 * Channel 0 is where every Object3D and Light starts. Duct interiors move to channel 1 and off
 * channel 0 entirely, which is what hides them from the main ambient light -- three.js only lets
 * a light touch an object when `light.layers.test(object.layers)` finds a shared channel.
 */
export const DUCT_LAYER = 1;

/**
 * Moves geometry onto the duct channel, out of reach of the main ambient light.
 * Anything passed here is lit only by real lights that have opted in via illuminateDucts().
 */
export function markDuctInterior(obj) {
    obj.layers.set(DUCT_LAYER);
}

/**
 * Opts a light into reaching duct interiors in addition to the rest of the world.
 * Every light except the main ambient wants this: a flashlight, a ceiling fixture spilling
 * through an open grate, and an entity's lamp all still carry into a duct. Forgetting it on a
 * new light is the one failure mode here -- the light will silently stop at the duct mouth.
 */
export function illuminateDucts(light) {
    light.layers.enable(DUCT_LAYER);
}

/**
 * Opts a raycaster into hitting duct geometry. Needed by anything that queries `env.walls`
 * directly -- spray tags, paintball impacts -- since a default raycaster only sees channel 0.
 */
export function raycastDucts(raycaster) {
    raycaster.layers.enable(DUCT_LAYER);
}

/**
 * True when a material was authored as a duct interior surface. Materials opt in by setting
 * `userData.ductInterior`, which survives the geometry batching in ChunkManager._compileInstances
 * -- meshes are grouped by material there, so a duct material always lands in its own batch and
 * the whole batch can take the layer at once.
 */
export function isDuctMaterial(mat) {
    if (!mat) return false;
    if (Array.isArray(mat)) {
        return mat.length > 0 && !!(mat[0].userData && mat[0].userData.ductInterior);
    }
    return !!(mat.userData && mat.userData.ductInterior);
}
