/**
 * [ROLE] Utility functions for entity navigation and collision.
 * [WHY] Consolidates redundant raycasting and AABB intersection logic used across multiple entity classes.
 * [STATE] Stateless utility module.
 * [DEPENDS] AABB, environment spatial grid.
 */
import AABB from '../math/AABB.js';

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
