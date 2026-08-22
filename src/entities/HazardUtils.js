
const _scratchRay = new THREE.Ray();

export function isRayPathBlocked(env, searchCenterX, searchCenterZ, searchDist, rayOrigin, rayDir, distSqLimit, rayTargetScratch, includeAllSolids = false) {
    if (!env || !env.spatialGrid) return false;
    const localBoxes = env.spatialGrid.getNearby(searchCenterX, searchCenterZ, searchDist);
    _scratchRay.set(rayOrigin, rayDir);
    for (let i = 0; i < localBoxes.length; i++) {
        const box = localBoxes[i];
        const isOpaque = includeAllSolids
            ? (!box.isInvisibleBlocker && !box.isVoid && !(box.isGrate && box.meshRef && !box.meshRef.userData.active))
            : (box.isEntityBlocker && !box.isInvisibleBlocker);
        if (isOpaque) {
            if (_scratchRay.intersectBox(box, rayTargetScratch)) {
                if (rayOrigin.distanceToSquared(rayTargetScratch) < distSqLimit) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * PLAYER COLLISION ENGINE
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * `sweepGroundedCollision` and `resolveEntityLocomotion` (below) may appear as duplicated 
 * AABB collision logic, but they are explicitly separated by design.
 * 
 * - THIS function (`sweepGroundedCollision`) is a high-fidelity physics sweep exclusively for the PLAYER.
 *   It handles step-offsets, dynamic ceiling clearance for crouching, void/falling detection, and tactile surface feedback.
 * 
 * - The functions below (`computeAxisBlocking` and `resolveEntityLocomotion`) are lightweight heuristics 
 *   exclusively for AI ENTITIES. They deliberately omit verticality, step-heights, and void checks to save CPU cycles.
 * 
 * DO NOT merge these functions. If you are modifying collision logic, ensure you are editing 
 * the correct system (Player vs. Entity) based on your target actor.
 */
// How far below the player's/entity's feet a box is still worth testing every frame.
// This used to be an effectively unbounded -10000 fudge, so a deep pit sector (CHASM)
// paid an ever-growing per-frame collision cost for every level stacked in the
// same XZ column, no matter how far below it actually was - the spatial hash only
// buckets by X/Z, so getNearby() returns all of them regardless of height. 100 units
// comfortably covers CHASM's deepest support truss (-80) without that cost climbing
// without bound. Boxes further below than this simply aren't "in play" yet; they come
// back into range as the falling body gets closer, well before it could ever reach
// them in a single frame.
const VERTICAL_RELEVANCE_MARGIN = 100.0;

export function sweepGroundedCollision(grid, body, moveX, moveZ, scratch) {
    const {x, z, feetY, radius, height, stepOffset, currentFeetY} = body;
    const snagShrink = Math.min(0.15, radius * 0.25);
    const ceilY = feetY + height;
    const stepY = Math.max(feetY + stepOffset, (currentFeetY !== undefined ? currentFeetY : feetY) + stepOffset);
    const boxX = scratch.boxX;
    const boxZ = scratch.boxZ;
    const floorBox = scratch.floorBox;
    
    boxX.min.set(x + moveX - radius, stepY, z - radius + snagShrink);
    boxX.max.set(x + moveX + radius, ceilY, z + radius - snagShrink);
    
    boxZ.min.set(x - radius + snagShrink, stepY, z + moveZ - radius);
    boxZ.max.set(x + radius - snagShrink, ceilY, z + moveZ + radius);
    
    floorBox.min.set(x - radius, -100000.0, z - radius);
    floorBox.max.set(x + radius, stepY, z + radius);

    let ceilingBox = scratch.ceilingBox;
    if (ceilingBox) {
        ceilingBox.min.set(x - radius, stepY, z - radius);
        ceilingBox.max.set(x + radius, 100000.0, z + radius);
    }
    
    const boxes = grid.getNearby(x, z, radius + 1.6);
    let hitX = false;
    let hitZ = false;
    let inVoid = false;
    let groundY = -100000;
    let dynamicMaxCamY = 100000.0;
    let hitFakeTunnel = false;

    for (let i = 0, len = boxes.length; i < len; i++) {
        const box = boxes[i];
        if (box.isInvisibleBlocker) continue;
        if (box.isGrate && box.meshRef && !box.meshRef.userData.active) continue;

        if (ceilingBox && !box.isVoid && !box.noCeilingClamp && box.min.y > stepY && ceilingBox.intersectsBox(box)) {
            const maxCam = box.min.y - scratch.ceilingClearance;
            if (maxCam < dynamicMaxCamY) {
                dynamicMaxCamY = maxCam;
            }
        }

        const isVerticallyRelevant = (box.min.y <= ceilY && box.max.y >= feetY - VERTICAL_RELEVANCE_MARGIN);
        if (!isVerticallyRelevant && !box.isVoid) continue;
        
        if (box.isVoid && floorBox.intersectsBox(box)) inVoid = true;
        
        if (box.max.y > groundY && box.max.y <= stepY) {
            if (!box.isVoid && floorBox.intersectsBox(box)) {
                groundY = box.max.y;
            }
        }
        
        if (hitX && hitZ) continue;
        if (!box.isVoid) {
            if (!hitX && boxX.intersectsBox(box)) {
                const cx = (box.min.x + box.max.x) * 0.5;
                if ((moveX > 0 && x < cx) || (moveX < 0 && x > cx)) {
                    hitX = true;
                    if (box.isFakeTunnel) hitFakeTunnel = true;
                }
            }
            if (!hitZ && boxZ.intersectsBox(box)) {
                const cz = (box.min.z + box.max.z) * 0.5;
                if ((moveZ > 0 && z < cz) || (moveZ < 0 && z > cz)) {
                    hitZ = true;
                    if (box.isFakeTunnel) hitFakeTunnel = true;
                }
            }
        }
    }
    
    if (!inVoid && groundY === -100000) groundY = 0;
    return {hitX, hitZ, inVoid, groundY, boxes, dynamicMaxCamY, hitFakeTunnel};
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

export function resolveEntityLocomotion(entity, speed, delta, options, scratch) {
    const env = entity.env;
    const pos = entity.group.position;
    const target = entity.target;
    const {
        doorRadiusSq = 16.0,
        boxRadius = 0.5,
        stuckStrategy = 'teleport',
        stuckTimeLimit = 2.0,
        teleportDist = 15.0
    } = options;

    if (env && env.interactiveDoors) {
        for (let i = 0; i < env.interactiveDoors.length; i++) {
            const door = env.interactiveDoors[i];
            if (door.userData.isAirlockDoor) continue;
            if (pos.distanceToSquared(door.position) < doorRadiusSq) {
                door.userData.entityOpen = true;
                door.userData.entityZ = pos.z;
            }
        }
    }

    scratch.dir.subVectors(target, pos);
    scratch.dir.y = 0;
    const distToTarget = scratch.dir.length();
    
    if (distToTarget > 0.1) {
        scratch.dir.normalize();
        scratch.moveVec.copy(scratch.dir).multiplyScalar(speed * delta);
        scratch.nextPos.copy(pos).add(scratch.moveVec);
        
        scratch.box.min.set(scratch.nextPos.x - boxRadius, 0.0, scratch.nextPos.z - boxRadius);
        scratch.box.max.set(scratch.nextPos.x + boxRadius, 4.0, scratch.nextPos.z + boxRadius);
        
        let blocked = false;
        const localBoxes = env.spatialGrid.getNearby(scratch.nextPos.x, scratch.nextPos.z, boxRadius + 1.2);
        for (let i = 0; i < localBoxes.length; i++) {
            if (localBoxes[i].isEntityBlocker && scratch.box.intersectsBox(localBoxes[i])) {
                blocked = true;
                break;
            }
        }
        
        if (!blocked) {
            pos.add(scratch.moveVec);
            entity.stuckTimer = 0;
        } else {
            const {blockedX, blockedZ} = computeAxisBlocking(
                scratch.boxX, scratch.boxZ, scratch.box, pos.x, pos.z, localBoxes
            );
            
            if (!blockedX && !blockedZ) {
                if (Math.abs(scratch.moveVec.x) > Math.abs(scratch.moveVec.z)) pos.x += scratch.moveVec.x;
                else pos.z += scratch.moveVec.z;
                entity.stuckTimer = 0;
            } else if (!blockedX) {
                pos.x += scratch.moveVec.x;
                entity.stuckTimer = 0;
            } else if (!blockedZ) {
                pos.z += scratch.moveVec.z;
                entity.stuckTimer = 0;
            } else {
                if (entity.stuckTimer !== undefined) {
                    entity.stuckTimer += delta;
                }
                
                if (stuckStrategy === 'teleport' && entity.stuckTimer > stuckTimeLimit) {
                    entity.stuckTimer = 0;
                    const tpAngle = Math.random() * Math.PI * 2;
                    pos.x = target.x + Math.cos(tpAngle) * teleportDist;
                    pos.z = target.z + Math.sin(tpAngle) * teleportDist;
                } else if (stuckStrategy === 'jitter') {
                    pos.x += (Math.random() - 0.5) * speed * delta;
                    pos.z += (Math.random() - 0.5) * speed * delta;
                }
            }
        }
    }
}
