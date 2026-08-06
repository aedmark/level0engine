/**
 * [ROLE] Spawns a breaker podium interaction point or a hallucination variant.
 * [WHY] Provides objective interaction locations or tricks the player based on sanity.
 * [STATE] Stateless blueprint generator, but modifies environment tracking lists (e.g., interactables, _globalSwitches) during build.
 * [DEPENDS] Requires BreakerPodium builder, env interaction arrays, player paranoia state.
 */
import {buildBreakerPodium, PODIUM_PLATE_Y} from '../BreakerPodium.js';

export const spawnBreakerPodium = (env, ctx, x, z) => {
    const {random, chunkGroup, hash} = ctx;
    
    const cx = x * env.cellSize;
    const cz = z * env.cellSize;
    
    if (ctx.markOccupied) ctx.markOccupied(x, z);
    const podium = buildBreakerPodium(env, hash, random);
    podium.position.set(cx, PODIUM_PLATE_Y, cz);
    podium.rotation.y = Math.floor(random() * 4) * (Math.PI / 2);
    
    // We only spawn real breakers via this method now
    podium.userData.type = 'exit_switch';
    podium.userData.chunkHash = hash;
    podium.userData.active = false;
    
    chunkGroup.add(podium);
    if (!env.interactables) env.interactables = [];
    env.interactables.push(podium);
    
    const pBox = new THREE.Box3(
        new THREE.Vector3(cx - 0.36, 0, cz - 0.36),
        new THREE.Vector3(cx + 0.36, 1.25, cz + 0.36)
    );
    pBox.chunkHash = hash;
    env.spatialGrid.insert(pBox);
};
