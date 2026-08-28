export const SettlingFieldProfile = (env, ctx) => {
    const {random, buildWall, addGeometry, buildChair, addFurniture, hash, stagingMeshes} = ctx;
    return {
        name: "THE SETTLING FIELD",
        prob: 0.001, build: (x, z) => {
            if (ctx.markOccupied) ctx.markOccupied(x, z);
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            const dA = random();
            const dB = random();
            let lSeed = ((dA * 4294967296) ^ (dB * 65536)) >>> 0;
            const lRand = () => {
                lSeed = (lSeed * 1664525 + 1013904223) >>> 0;
                return lSeed / 4294967296.0;
            };
            if (!env.fallenTileGeo) {
                env.fallenTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                env.geoCache.set(env.fallenTileGeo.uuid, true);
            }
            if (!env.rottedTileMat) {
                env.rottedTileMat = env.ceilMat.clone();
                env.rottedTileMat.color.setHex(0x93856b);
                env.rottedTileMat.roughness = 0.95;
                env.rottedTileMat.userData = { noShadow: true };
                env.sharedAssets.add(env.rottedTileMat.uuid);
            }
            if (!env.ceilingHoleMat) {
                env.ceilingHoleMat = new THREE.MeshBasicMaterial({color: 0x060504});
                env.ceilingHoleMat.userData = { noShadow: true };
                env.sharedAssets.add(env.ceilingHoleMat.uuid);
            }
            const tileCount = 2 + Math.floor(lRand() * 3);
            for (let i = 0; i < tileCount; i++) {
                const tile = new THREE.Mesh(env.fallenTileGeo, env.rottedTileMat);
                tile.position.set(cx + (lRand() - 0.5) * 2.6, 0.03 + lRand() * 0.09, cz + (lRand() - 0.5) * 2.6);
                tile.rotation.set((lRand() - 0.5) * 0.3, lRand() * Math.PI, (lRand() - 0.5) * 0.3);
                addGeometry(tile);
            }
            const hole = buildWall(1.6, 1.6, env.ceilingHoleMat, 0.02);
            hole.position.set(cx, 2.975, cz);
            addGeometry(hole);
            if (!env.hingedTileGeo) {
                env.hingedTileGeo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                env.hingedTileGeo.translate(0, 0, 0.45);
                env.geoCache.set(env.hingedTileGeo.uuid, true);
            }
            const dangleCount = 1 + Math.floor(lRand() * 3);
            for (let i = 0; i < dangleCount; i++) {
                const side = Math.floor(lRand() * 4);
                const along = (lRand() - 0.5) * 1.0;
                const dangle = new THREE.Mesh(env.hingedTileGeo, env.rottedTileMat);
                const dxr = (side === 0 ? -0.85 : (side === 1 ? 0.85 : along));
                const dzr = (side === 2 ? -0.85 : (side === 3 ? 0.85 : along));
                dangle.position.set(cx + dxr, 2.955, cz + dzr);
                dangle.rotation.order = 'YXZ';
                dangle.rotation.y = (side === 0 ? Math.PI / 2 : (side === 1 ? -Math.PI / 2 : (side === 3 ? Math.PI : 0)));
                dangle.rotation.x = 1.0 + lRand() * 0.45;
                dangle.rotation.z = (lRand() - 0.5) * 0.12;
                dangle.userData.chunkHash = hash;
                dangle.updateMatrixWorld(true);
                stagingMeshes.push(dangle);
            }
            const paperCount = 2 + Math.floor(lRand() * 3);
            for (let i = 0; i < paperCount; i++) {
                const sheet = new THREE.Mesh(env.documentGeo, env.documentMat);
                sheet.position.set(cx + (lRand() - 0.5) * 3.2, 0.015 + (lRand() * 0.02) + (i * 0.002), cz + (lRand() - 0.5) * 3.2);
                sheet.rotation.y = lRand() * Math.PI * 2;
                addGeometry(sheet);
            }

            if (dA > 0.6) {
                const felled = buildChair(cx + (lRand() - 0.5) * 1.6, 0, cz + (lRand() - 0.5) * 1.6, lRand() * Math.PI * 2);
                felled.rotation.z = (lRand() > 0.5 ? 1 : -1) * Math.PI / 2;
                felled.position.y = 0.38;
                addFurniture(felled);
            }
        }
    };
};
