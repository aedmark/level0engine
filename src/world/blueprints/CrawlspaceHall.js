import {archBorderMats} from './ArchBorderMats.js';

export const CrawlspaceHallProfile = (env, ctx) => {
    const { addGeometry, random } = ctx;
    return {
        name: "CRAWLSPACE_HALL",
        prob: 0,
        build: (x, z, isWallCell) => {
            if (ctx.claimCell) ctx.claimCell(x, z);
            const dropHeight = 1.8;
            const yCenter = 3.0 - (dropHeight / 2);

            const dropGeo = env._cacheGeo('crawlspace_drop', () => {
                return new THREE.BoxGeometry(env.cellSize, dropHeight, env.cellSize);
            });

            const baseMat = env.ceilingMat || env.sharedWallMat;
            const dropMats = archBorderMats(env, ctx, random, x, z, baseMat, [
                {index: 0, dx: 1, dz: 0},
                {index: 1, dx: -1, dz: 0},
                {index: 4, dx: 0, dz: 1},
                {index: 5, dx: 0, dz: -1}
            ]);

            const dropMesh = new THREE.Mesh(dropGeo, dropMats);
            dropMesh.position.set(x * env.cellSize, yCenter, z * env.cellSize);
            dropMesh.userData.isEntityBlocker = true;
            addGeometry(dropMesh);

            const cx = x * env.cellSize;
            const cz = z * env.cellSize;

            const BASEBOARD_H = 3.0 * (32 / 512);
            const TRIM_H = 3.0 * (4 / 512);
            const dropBottom = 3.0 - dropHeight;
            const bandW = env.cellSize + 0.06;

            const Z_FIGHT_NUDGE = 0.002;

            const band = new THREE.Mesh(env._boxGeo(bandW, BASEBOARD_H, bandW), env.baseboardMat);
            band.position.set(cx, dropBottom + BASEBOARD_H / 2 - Z_FIGHT_NUDGE, cz);
            band.userData.noCollision = true;
            addGeometry(band);

            const bandTrim = new THREE.Mesh(env._boxGeo(bandW, TRIM_H, bandW), env.baseboardTrimMat);
            bandTrim.position.set(cx, dropBottom + BASEBOARD_H + TRIM_H / 2 - Z_FIGHT_NUDGE, cz);
            bandTrim.userData.noCollision = true;
            addGeometry(bandTrim);
        }
    };
};
