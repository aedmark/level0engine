// HazardUtils.js
// LEVEL 0 SHARED HAZARD-ENTITY HELPERS

import AABB from '../math/AABB.js';

/**
 * Shared building blocks for the sector-locked hazard entities (Anomaly, WardenEntity,
 * ArchivistEntity, IncineratorEntity, BackupDaemonEntity). These four/five classes each hand-roll
 * their own line-of-sight raycast and wall-slide collision math with near-identical inner loops,
 * even though their surrounding policy -- when to check, what to do once blocked, how to recover
 * from being stuck -- is genuinely different per entity (a "weeping angel" stare check is not a
 * proximity-based pursuit check). This module factors out only the parts that are byte-for-byte
 * identical across call sites, leaving each entity's own throttling, gating, and stuck-recovery
 * logic exactly where it was.
 */

/**
 * Tests whether a ray from `rayOrigin` in direction `rayDir` hits any `isEntityBlocker` box
 * (that isn't itself invisible) closer than `distSqLimit`, restricted to whatever the spatial
 * grid returns for a `searchDist`-radius query centered on (`searchCenterX`, `searchCenterZ`).
 *
 * This is the exact inner loop that used to be duplicated across Anomaly._updateSenses,
 * WardenEntity._updateSenses, and IncineratorEntity._checkIfSpotted -- each of them just fed it
 * different ray origins/directions (entity-to-player vs. player-to-entity) and different search
 * centers, which is why those stay as parameters here rather than being baked in.
 *
 * @param {Environment} env - The environment instance (needs `.spatialGrid`); a missing grid is
 *   treated as "nothing blocks," matching every call site's original fallback.
 * @param {number} searchCenterX - X to center the spatial grid query on.
 * @param {number} searchCenterZ - Z to center the spatial grid query on.
 * @param {number} searchDist - Radius to query the spatial grid for candidate boxes.
 * @param {THREE.Vector3|Vec3} rayOrigin - World-space origin of the sight-line ray.
 * @param {THREE.Vector3|Vec3} rayDir - Normalized world-space direction of the sight-line ray.
 * @param {number} distSqLimit - Squared distance beyond which a hit no longer counts as blocking.
 * @param {Vec3} rayTargetScratch - Scratch vector the raycast writes its hit point into.
 * @returns {boolean} True if something blocks the line of sight before `distSqLimit`.
 */
export function isRayPathBlocked(env, searchCenterX, searchCenterZ, searchDist, rayOrigin, rayDir, distSqLimit, rayTargetScratch) {
    if (!env || !env.spatialGrid) return false;
    const localBoxes = env.spatialGrid.getNearby(searchCenterX, searchCenterZ, searchDist);
    for (let i = 0; i < localBoxes.length; i++) {
        const box = localBoxes[i];
        if (box.isEntityBlocker && !box.isInvisibleBlocker) {
            if (AABB.rayIntersectsBox(rayOrigin, rayDir, box, rayTargetScratch)) {
                if (rayOrigin.distanceToSquared(rayTargetScratch) < distSqLimit) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Resolves independent per-axis wall-slide blocking: given a primary collision box already built
 * around the entity's attempted next position, tests a narrower box on each axis (clamped to the
 * *current* position +/-0.5 on the perpendicular axis -- a fixed margin every caller already used
 * identically) against the same candidate box list, so a hazard blocked diagonally can still slide
 * along whichever axis is actually clear.
 *
 * This is the exact inner test that used to be duplicated across Anomaly, WardenEntity, and
 * IncineratorEntity's `_resolveLocomotion` -- everything downstream of it (what to do once you
 * know blockedX/blockedZ: which axis to prefer, how to recover once fully stuck, whether to
 * respect forbidden-sector bounds) stayed different per entity and stays in each entity's own
 * file untouched.
 *
 * @param {AABB} scratchBoxX - Reused scratch AABB for the X-axis test (mutated in place).
 * @param {AABB} scratchBoxZ - Reused scratch AABB for the Z-axis test (mutated in place).
 * @param {AABB} primaryBox - The full collision box already built around the attempted move.
 * @param {number} posX - The entity's current (pre-move) X position.
 * @param {number} posZ - The entity's current (pre-move) Z position.
 * @param {Array<AABB>} localBoxes - Candidate boxes from the spatial grid query already run for
 *   the primary blocked check (reused here rather than re-queried).
 * @param {boolean} [seedBlockedX=false] - Initial X-blocked state (Anomaly seeds this from its
 *   forbidden-sector check before any box test runs; everyone else starts at false).
 * @param {boolean} [seedBlockedZ=false] - Initial Z-blocked state, same deal as `seedBlockedX`.
 * @returns {{blockedX: boolean, blockedZ: boolean}}
 */
export function computeAxisBlocking(scratchBoxX, scratchBoxZ, primaryBox, posX, posZ, localBoxes, seedBlockedX = false, seedBlockedZ = false) {
    scratchBoxX.copy(primaryBox);
    scratchBoxX.min.z = posZ - 0.5;
    scratchBoxX.max.z = posZ + 0.5;
    scratchBoxZ.copy(primaryBox);
    scratchBoxZ.min.x = posX - 0.5;
    scratchBoxZ.max.x = posX + 0.5;
    let blockedX = seedBlockedX;
    let blockedZ = seedBlockedZ;
    for (let i = 0; i < localBoxes.length; i++) {
        if (localBoxes[i].isEntityBlocker) {
            if (!blockedX && scratchBoxX.intersectsBox(localBoxes[i])) blockedX = true;
            if (!blockedZ && scratchBoxZ.intersectsBox(localBoxes[i])) blockedZ = true;
        }
    }
    return {blockedX, blockedZ};
}
