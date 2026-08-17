import AABB from '../math/AABB.js';

// `includeAllSolids` widens the occlusion test from the isEntityBlocker set to
// everything the player would physically collide with, so an entity held to the
// player's collision rules cannot see through the same crate it has to walk
// around.
export function isRayPathBlocked(env, searchCenterX, searchCenterZ, searchDist, rayOrigin, rayDir, distSqLimit, rayTargetScratch, includeAllSolids = false) {
    if (!env || !env.spatialGrid) return false;
    const localBoxes = env.spatialGrid.getNearby(searchCenterX, searchCenterZ, searchDist);
    for (let i = 0; i < localBoxes.length; i++) {
        const box = localBoxes[i];
        const isOpaque = includeAllSolids
            ? (!box.isInvisibleBlocker && !box.isVoid && !(box.isGrate && box.meshRef && !box.meshRef.userData.active))
            : (box.isEntityBlocker && !box.isInvisibleBlocker);
        if (isOpaque) {
            if (AABB.rayIntersectsBox(rayOrigin, rayDir, box, rayTargetScratch)) {
                if (rayOrigin.distanceToSquared(rayTargetScratch) < distSqLimit) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Runs an entity through the exact collision rules PlayerController.update
// applies to the player, against the same grid: every solid box counts, not
// just the ones flagged isEntityBlocker; a box whose top sits within the step
// height reads as floor to stand on rather than wall to bump into; a footprint
// hanging over a void has nothing underneath it. Anything moving through this
// obeys the level the way the player does, gravity included.
export function stepGroundedBody(grid, body, moveX, moveZ, scratch) {
    const {x, z, feetY, radius, height, stepOffset} = body;
    const snagShrink = Math.min(0.15, radius * 0.25);
    const ceilY = feetY + height;
    const stepY = feetY + stepOffset;
    const boxX = scratch.boxX;
    const boxZ = scratch.boxZ;
    const floorBox = scratch.floorBox;
    boxX.min.set(x + moveX - radius, stepY, z - radius + snagShrink);
    boxX.max.set(x + moveX + radius, ceilY, z + radius - snagShrink);
    boxZ.min.set(x - radius + snagShrink, stepY, z + moveZ - radius);
    boxZ.max.set(x + radius - snagShrink, ceilY, z + moveZ + radius);
    floorBox.min.set(x - radius, -10.0, z - radius);
    floorBox.max.set(x + radius, stepY, z + radius);
    const boxes = grid.getNearby(x, z, radius + 1.6);
    let hitX = false;
    let hitZ = false;
    let inVoid = false;
    let groundY = -100;
    for (let i = 0, len = boxes.length; i < len; i++) {
        const box = boxes[i];
        if (box.isInvisibleBlocker) continue;
        if (box.isGrate && box.meshRef && !box.meshRef.userData.active) continue;
        const isVerticallyRelevant = (box.min.y <= ceilY && box.max.y >= feetY - 10.0);
        if (!isVerticallyRelevant && !box.isVoid) continue;
        if (box.isVoid && floorBox.intersectsBox(box)) inVoid = true;
        if (box.max.y > groundY && box.max.y <= stepY) {
            if (!box.isVoid && floorBox.intersectsBox(box)) groundY = box.max.y;
        }
        if (hitX && hitZ) continue;
        if (!hitX && boxX.intersectsBox(box)) {
            const cx = (box.min.x + box.max.x) * 0.5;
            if ((moveX > 0 && x < cx) || (moveX < 0 && x > cx)) hitX = true;
        }
        if (!hitZ && boxZ.intersectsBox(box)) {
            const cz = (box.min.z + box.max.z) * 0.5;
            if ((moveZ > 0 && z < cz) || (moveZ < 0 && z > cz)) hitZ = true;
        }
    }
    if (!inVoid && groundY === -100) groundY = 0;
    return {hitX, hitZ, inVoid, groundY, boxes};
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
