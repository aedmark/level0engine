export const CrawlspaceHallProfile = (env, ctx) => {
    const { addGeometry, random } = ctx;
    return {
        name: "CRAWLSPACE_HALL",
        prob: 0,
        build: (x, z, isWallCell) => {
            const dropHeight = 1.8;
            const yCenter = 3.0 - (dropHeight / 2);

            const dropGeo = env._cacheGeo('crawlspace_drop', () => {
                return new THREE.BoxGeometry(env.cellSize, dropHeight, env.cellSize);
            });

            const dropMesh = new THREE.Mesh(dropGeo, env.ceilingMat || env.sharedWallMat);
            dropMesh.position.set(x * env.cellSize, yCenter, z * env.cellSize);
            dropMesh.userData.isEntityBlocker = true;
            addGeometry(dropMesh);

            // Removed the black pipe generation per user request

            // Low-clearance warning trim, built the same way as the baseboard overlay:
            // one shared unit geometry scaled per instance (cheap — no per-footprint
            // geometry fragmenting InstancedMesh groups), sitting proud of the drop
            // mesh's underside instead of coplanar with it (no z-fighting), and placed
            // only at sides that are an actual open passage rather than spanning the
            // full cell width into whatever is next door (the old bug).
            if (!env.hazardTapeMat) {
                env.hazardTapeMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.9 });
                env.hazardTapeMat.userData.noShadow = true;
                if (env.sharedAssets) env.sharedAssets.add(env.hazardTapeMat.uuid);
            }
            const stripeUnitGeo = env._cacheGeo('hazard_tape_unit', () => new THREE.BoxGeometry(1, 0.06, 0.08));
            const half = env.cellSize / 2;
            const stripeY = 1.2 - 0.04; // proud of the drop mesh's bottom face (y=1.2), not coplanar
            const stripeLen = env.cellSize - 0.4; // inset off the cell boundary so it can't reach a neighbor's wall
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;

            const sides = [
                {open: !isWallCell(x, z - 1), dx: 0, dz: -half + 0.06, rotY: 0},
                {open: !isWallCell(x, z + 1), dx: 0, dz: half - 0.06, rotY: 0},
                {open: !isWallCell(x - 1, z), dx: -half + 0.06, dz: 0, rotY: Math.PI / 2},
                {open: !isWallCell(x + 1, z), dx: half - 0.06, dz: 0, rotY: Math.PI / 2},
            ];
            sides.forEach(side => {
                if (!side.open) return;
                const strip = new THREE.Mesh(stripeUnitGeo, env.hazardTapeMat);
                strip.scale.set(stripeLen, 1, 1);
                strip.position.set(cx + side.dx, stripeY, cz + side.dz);
                strip.rotation.y = side.rotY;
                strip.userData.noCollision = true;
                addGeometry(strip);
            });
        }
    };
};
