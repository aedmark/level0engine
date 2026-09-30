
import { spawnBreakerPodium } from './BreakerPodiumSpawn.js';
import { EmptyDoorFrameProfile } from './blueprints/EmptyDoorFrame.js';
import { CrawlspaceDuctProfile } from './blueprints/CrawlspaceDuct.js';
import { CrawlspaceHallProfile } from './blueprints/CrawlspaceHall.js';
import { CreviceHallProfile } from './blueprints/CreviceHall.js';
import { RideQueueHallProfile } from './blueprints/RideQueueHall.js';
import { ArchHallProfile } from './blueprints/ArchHall.js';
import { isAirlockApron } from './AirlockApron.js';

const RECT_LIGHT_SIZE_MARGIN = 0.6;
let _panelRectQuatFlat = null;
let _panelRectQuatRotated = null;
export function _panelRectQuaternion(isRotated) {
    if (!_panelRectQuatFlat) {
        _panelRectQuatFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'));
        _panelRectQuatRotated = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'));
    }
    return isRotated ? _panelRectQuatRotated : _panelRectQuatFlat;
}

export function buildEmptyCell(manager, args, state) {

        const { x, z, env, ctx, random, hash, chunkGroup, localX, localZ, isWallCell, isSolidWallCell, breakerPositions } = args;
        let hasTallObstacle = false;


        if (!state.spawnedVirtualBreaker && env._virtualBreaker && env._virtualBreaker.chunkHash === hash && !env._virtualBreaker.spawned) {
            spawnBreakerPodium(env, ctx, x, z);
            env._virtualBreaker.spawned = true;
            env._virtualBreaker.mesh = env.interactables[env.interactables.length - 1];
            state.spawnedVirtualBreaker = true;
            hasTallObstacle = true;
        }

        let forcedName = ctx.getForcedStructure && ctx.getForcedStructure(x, z);
        const YIELDS_TO_DUCT = ["empty_door_frame", "CRAWLSPACE_HALL"];
        const DUCT_STRUCTURES = ["DUCT", "VENT", "CRAWLSPACE_DUCT", "CREVICE_NETWORK"];
        if (forcedName && YIELDS_TO_DUCT.includes(forcedName) && ctx.getForcedStructure) {
            const abuttingDuct =
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x + 1, z)) ||
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x - 1, z)) ||
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x, z + 1)) ||
                DUCT_STRUCTURES.includes(ctx.getForcedStructure(x, z - 1));
            if (abuttingDuct) forcedName = null;
        }

        if (forcedName === 'empty_door_frame') {
            hasTallObstacle = true;
            const breachProfile = EmptyDoorFrameProfile(env, ctx);
            breachProfile.build(x, z, ctx.isWall);
        } else if (forcedName === 'CRAWLSPACE_HALL') {
            hasTallObstacle = true;
            const crawlProfile = CrawlspaceHallProfile(env, ctx);
            crawlProfile.build(x, z, isWallCell);
        } else if (forcedName === 'CREVICE_HALL') {
            hasTallObstacle = true;
            const creviceProfile = CreviceHallProfile(env, ctx);
            creviceProfile.build(x, z, ctx.isWall);
        } else if (forcedName === 'RIDE_QUEUE_HALL') {
            hasTallObstacle = true;
            const rideProfile = RideQueueHallProfile(env, ctx);
            rideProfile.build(x, z, isWallCell);
        } else if (forcedName === 'ARCH_HALL') {
            hasTallObstacle = true;
            const archProfile = ArchHallProfile(env, ctx);
            archProfile.build(x, z, isWallCell);
        }

        const inNRing = localZ === 3 && localX >= 3 && localX <= 11;
        const inSRing = localZ === 11 && localX >= 3 && localX <= 11;
        const inWRing = localX === 3 && localZ >= 3 && localZ <= 11;
        const inERing = localX === 11 && localZ >= 3 && localZ <= 11;
        const inNPath = localX === 7 && localZ <= 3;
        const inSPath = localX === 7 && localZ >= 11;
        const inWPath = localZ === 7 && localX <= 3;
        const inEPath = localZ === 7 && localX >= 11;
        const isArtery = inNRing || inSRing || inWRing || inERing || inNPath || inSPath || inWPath || inEPath;
        const isAirlockApproach = isAirlockApron(env, x, z);

        const floorRoll = random();
        let isNearFixture = false;
        if (ctx.getForcedStructure) {
            const fixtures = ["HINGED DOORWAY", "DUCT", "VENT", "empty_door_frame", "CRAWLSPACE_DUCT", "CREVICE_NETWORK"];
            if (fixtures.includes(ctx.getForcedStructure(x + 1, z))) isNearFixture = true;
            else if (fixtures.includes(ctx.getForcedStructure(x - 1, z))) isNearFixture = true;
            else if (fixtures.includes(ctx.getForcedStructure(x, z + 1))) isNearFixture = true;
            else if (fixtures.includes(ctx.getForcedStructure(x, z - 1))) isNearFixture = true;
        }
        
        if (!hasTallObstacle && floorRoll > 0.80 && !isArtery && !isAirlockApproach && !isNearFixture) {
            hasTallObstacle = true;
            const divW = random() > 0.5 ? env.cellSize * 0.5 : env.cellSize * 0.2;
            const divD = divW === env.cellSize * 0.5 ? env.cellSize * 0.2 : env.cellSize * 0.5;
            const divider = ctx.buildWall(divW, divD, env.sharedWallMat);
            divider.position.set(x * env.cellSize, 1.5, z * env.cellSize);
            ctx.addGeometry(divider);
            if (random() > 0.6) {
                const isWide = divW > divD;
                const clearX = isWide ? 0.0 : 1.2;
                const clearZ = isWide ? 1.2 : 0.0;
                const rot = isWide ? 0 : -Math.PI / 2;
                const chair = ctx.buildChair(x * env.cellSize + clearX, 0, z * env.cellSize + clearZ, rot);
                ctx.addFurniture(chair);
            }
        }
        if (!hasTallObstacle && random() > 0.20) {
            const isBroken = random() > 0.60;
            const isRotated = random() > 0.5;
            const posX = (x * env.cellSize);
            const posZ = (z * env.cellSize);
            const activeMat = env.getPooledMazeLightMaterial(isBroken);
            const matArray = [
                env.baseHousingMat, env.baseHousingMat, env.baseHousingMat,
                activeMat, env.baseHousingMat, env.baseHousingMat
            ];
            const panel = new THREE.Mesh(env.sharedPanelGeo, matArray);
            panel.position.set(posX, 2.98, posZ);
            if (isRotated) panel.rotation.y = Math.PI / 2;
            panel.userData.chunkHash = hash;
            chunkGroup.add(panel);
            env.walls.push(panel);
            if (!isBroken) {
                const isTracked = random() > 0.85;
                env.fixtureData.push({
                    chunkHash: hash,
                    position: new THREE.Vector3(posX, 2.8, posZ),
                    flickerOffset: random() * 500,
                    material: activeMat,
                    isFaulty: isTracked ? (random() > 0.75) : false,
                    baseIntensity: isTracked ? 0.6 : 0.0,
                    targetIntensity: isTracked ? 0.6 : 0.0,
                    currentIntensity: isTracked ? 0.6 : 0.0,
                    isFake: !isTracked,
                    isPanelLight: true,
                    rectBaseIntensity: 1.0,
                    rectWidth: env.sharedPanelGeo.parameters.width * RECT_LIGHT_SIZE_MARGIN,
                    rectHeight: env.sharedPanelGeo.parameters.depth * RECT_LIGHT_SIZE_MARGIN,
                    rectQuaternion: _panelRectQuaternion(isRotated)
                });
            }
        } else if (!hasTallObstacle && random() > 0.95 && state.chunkBreakerCount < 3 && !isArtery) {
            const px = x * env.cellSize;
            const pz = z * env.cellSize;
            const mountSide = isSolidWallCell(x, z - 1) ? 'N' : (isSolidWallCell(x - 1, z) ? 'W' : null);
            let isTooClose = mountSide === null;
            for (let b = 0; b < breakerPositions.length; b++) {
                const dx = px - breakerPositions[b].x;
                const dz = pz - breakerPositions[b].z;
                if (dx * dx + dz * dz < 256.0) {
                    isTooClose = true;
                    break;
                }
            }
            if (ctx.playerPos) {
                const dxPlayer = px - ctx.playerPos.x;
                const dzPlayer = pz - ctx.playerPos.z;
                if (dxPlayer * dxPlayer + dzPlayer * dzPlayer < 1600.0) {
                    isTooClose = true;
                }
            }
            if (!isTooClose) {
                state.chunkBreakerCount++;
                breakerPositions.push({x: px, z: pz});
                const half = env.cellSize / 2;
                const breakerGroup = new THREE.Group();
                if (mountSide === 'N') {
                    breakerGroup.position.set(px, 1.5, pz - half + 0.11);
                } else {
                    breakerGroup.position.set(px - half + 0.11, 1.5, pz);
                    breakerGroup.rotation.y = Math.PI / 2;
                }
                const shellMat = env.breakerPanelMat || env.pittedMetalMat;
                const breakerBase = new THREE.Mesh(env.breakerBaseGeo, shellMat);
                breakerBase.position.set(0, 0, -0.025);
                breakerGroup.add(breakerBase);
                const breakerDoor = new THREE.Mesh(env.breakerDoorGeo, shellMat);
                breakerDoor.position.set(-0.3, 0, 0.102);
                const breakerHandle = new THREE.Mesh(env.breakerHandleGeo, env.breakerHandleMat);
                breakerHandle.position.set(0.5, 0, 0.05);
                breakerDoor.add(breakerHandle);
                breakerGroup.add(breakerDoor);
                breakerGroup.userData = {type: 'breaker', chunkHash: hash, active: true, door: breakerDoor};
                chunkGroup.add(breakerGroup);
                env.interactables.push(breakerGroup);
            }
        }
    }
