/**
 * Pooled glow for pickup props (notes, tapes, laptops, clipboards, vending fronts).
 *
 * These used to each own a THREE.PointLight parented to the prop. That put a variable
 * number of real lights in the scene: one per prop in every loaded chunk. Since the
 * light count is baked into every material's shader program key, each chunk load,
 * chunk unload and pickup changed it and forced the whole visible set to relink
 * mid-frame — measured at 26 new programs / ~72ms for a single light appearing or
 * disappearing.
 *
 * A prop glow is now a LumenGrid fixture instead, competing for the same fixed pool of
 * 32 lights as every ceiling panel and lamp in the level. The scene's light count no
 * longer depends on what is loaded or what the player has picked up.
 */

// LumenGrid scales non-shadow slots by 0.35 (_updateLightProperties). Fixtures declare
// the intensity they want the pooled light to end up at, so undo that here and the
// glow matches what the old dedicated PointLight produced.
const POOL_NON_SHADOW_SCALAR = 0.35;

// Prop glows sit centimetres from the player's face when they lean over a desk, so on
// raw distance they would evict every room fixture around them and leave the room dark
// behind the note. This handicap (in distance-squared units, so roughly "pretend it is
// 6m further away than it is") keeps them losing to real lighting until they are the
// closest thing by a clear margin.
const PROP_GLOW_SLOT_BIAS = 40.0;

const _glowPos = new THREE.Vector3();

/**
 * Registers `obj`'s glow with the light pool and tags the prop so a pickup can retire it.
 * `offset` is in the prop's local space, matching where the old PointLight was parented.
 */
export function attachPropGlow(env, obj, hash, {color, intensity, distance, offset, flickerOffset = 0}) {
    if (!env.fixtureData) return null;
    obj.updateMatrixWorld(true);
    _glowPos.set(offset ? offset[0] : 0, offset ? offset[1] : 0, offset ? offset[2] : 0);
    obj.localToWorld(_glowPos);
    const scaled = intensity / POOL_NON_SHADOW_SCALAR;
    const fixture = {
        chunkHash: hash,
        position: _glowPos.clone(),
        color: new THREE.Color(color),
        distance,
        baseIntensity: scaled,
        targetIntensity: scaled,
        currentIntensity: scaled,
        flickerOffset,
        // A note on the floor is not worth a shadow map, and it must not register as the
        // light the player is squinting at — glare and pupil adaptation read the nearest
        // fixture, and before pooling these glows were not fixtures at all.
        noShadow: true,
        noGlare: true,
        slotBias: PROP_GLOW_SLOT_BIAS,
        isPropGlow: true
    };
    env.fixtureData.push(fixture);
    obj.userData.glowFixture = fixture;
    return fixture;
}

/**
 * Called when a prop is picked up and hidden. Drops its fixture from the pool's candidate
 * list, and — belt and braces for anything that still parents a real light to a prop —
 * re-homes stray lights onto the chunk group at zero intensity rather than letting them
 * wink out of the scene with the mesh, which is the relink that started all this.
 */
export function releasePropLighting(env, obj) {
    const fixture = obj.userData && obj.userData.glowFixture;
    if (fixture) {
        obj.userData.glowFixture = null;
        const idx = env.fixtureData.indexOf(fixture);
        if (idx !== -1) env.fixtureData.splice(idx, 1);
    }

    const host = obj.parent;
    if (!host) return;
    const strays = [];
    obj.traverse((o) => {
        if (o.isLight) strays.push(o);
    });
    if (!strays.length) return;
    host.updateWorldMatrix(true, false);
    for (const light of strays) {
        light.updateWorldMatrix(true, false);
        _glowPos.setFromMatrixPosition(light.matrixWorld);
        light.intensity = 0;
        host.add(light);
        host.worldToLocal(_glowPos);
        light.position.copy(_glowPos);
    }
}
