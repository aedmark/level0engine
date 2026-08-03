import {buildBreakerPodium, PODIUM_PLATE_Y} from '../BreakerPodium.js';

export const BreakerPodiumSpawnProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, chunkGroup, hash} = ctx;
    return {
        name: "BREAKER PODIUM",
        prob: 0.032, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            if (!env._globalSwitches) env._globalSwitches = [];
            let tooClose = false;
            for (let i = 0; i < env._globalSwitches.length; i++) {
                const s = env._globalSwitches[i];
                const distSq = (cx - s.x) * (cx - s.x) + (cz - s.z) * (cz - s.z);
                const limit = s.poi ? 900.0 : 3600.0;
                if (distSq > 0.1 && distSq < limit) {
                    tooClose = true;
                    break;
                }
            }
            if (ctx.playerPos) {
                const dxPlayer = cx - ctx.playerPos.x;
                const dzPlayer = cz - ctx.playerPos.z;
                if (dxPlayer * dxPlayer + dzPlayer * dzPlayer < 1600.0) {
                    tooClose = true;
                }
            }
            if (tooClose) {
                const wall = buildWall(env.cellSize, env.cellSize, env.sharedWallMat);
                wall.position.set(cx, 1.5, cz);
                wall.userData.isEntityBlocker = true;
                addGeometry(wall);
                return;
            }
            const isHallucination = (env.player && env.player.paranoia > 0.8) && (random() > 0.5);
            if (!isHallucination && !env._globalSwitches.some(s => Math.abs(s.x - cx) < 0.1 && Math.abs(s.z - cz) < 0.1)) {
                env._globalSwitches.push({x: cx, z: cz, poi: false});
            }
            if (ctx.markOccupied) ctx.markOccupied(x, z);
            const podium = buildBreakerPodium(env, hash, random);
            podium.position.set(cx, PODIUM_PLATE_Y, cz);
            podium.rotation.y = Math.floor(random() * 4) * (Math.PI / 2);
            podium.userData.type = isHallucination ? 'grate' : 'exit_switch';
            podium.userData.chunkHash = hash;
            podium.userData.active = false;
            chunkGroup.add(podium);
            if (!env.interactables) env.interactables = [];
            env.interactables.push(podium);
            if (isHallucination && podium.userData.bead) {
                podium.userData.bead.material.emissive.setHex(0xffaa00);
            }
            const pBox = new THREE.Box3(
                new THREE.Vector3(cx - 0.36, 0, cz - 0.36),
                new THREE.Vector3(cx + 0.36, 1.25, cz + 0.36)
            );
            pBox.chunkHash = hash;
            env.spatialGrid.insert(pBox);
        }
    };
};
