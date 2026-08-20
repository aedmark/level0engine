import {ARCH_WALK_CLEARANCE} from '../StructureKit.js';
import {placeArchWaitingArea} from './ArchWaitingArea.js';

export const CurvedArchwayProfile = (env, ctx) => {
    const {random, buildArchCutout, addGeometry} = ctx;
    return {
        name: "CURVED ARCHWAY",
        prob: 0.03, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            if (ctx.markOccupied) ctx.markOccupied(x, z);
            
            const neighbors = {
                px: ctx.isWall(x + 1, z),
                nx: ctx.isWall(x - 1, z),
                pz: ctx.isWall(x, z + 1),
                nz: ctx.isWall(x, z - 1)
            };
            
            let isAlignedZ;
            if (!neighbors.pz || !neighbors.nz) {
                isAlignedZ = true;
            } else if (!neighbors.px || !neighbors.nx) {
                isAlignedZ = false;
            } else {
                isAlignedZ = random() > 0.5;
            }
            const pillarThickness = 0.8;
            
            const outerX = env.cellSize / 2;
            const radius = outerX - pillarThickness;
            
            const archHeight = radius + 0.3;
            const springHeight = 3.0 - archHeight;

            if (buildArchCutout) {
                const mat = env.subwayTileMats ? env.subwayTileMats[Math.floor(random() * env.subwayTileMats.length)] : env.structMat;
                const arch = buildArchCutout(radius, pillarThickness, archHeight, env.cellSize, springHeight, mat);
                arch.position.set(cx, 0, cz);
                if (!isAlignedZ) {
                    arch.rotation.y = Math.PI / 2;
                }
                arch.userData.isEntityBlocker = true;
                arch.userData.noCollision = true;
                addGeometry(arch);
                ctx.addArchCutoutColliders(arch, radius, pillarThickness, archHeight, env.cellSize, springHeight, 24, ARCH_WALK_CLEARANCE);

                const jambOffset = outerX - pillarThickness / 2;
                for (const side of [-1, 1]) {
                    ctx.addBaseboardBox(
                        cx + (isAlignedZ ? side * jambOffset : 0),
                        cz + (isAlignedZ ? 0 : side * jambOffset),
                        isAlignedZ ? pillarThickness : env.cellSize,
                        isAlignedZ ? env.cellSize : pillarThickness
                    );
                }

                if (random() > 0.34) {
                    const along = isAlignedZ ? {dx: 0, dz: 1} : {dx: 1, dz: 0};
                    const across = isAlignedZ ? {dx: 1, dz: 0} : {dx: 0, dz: 1};
                    const sides = random() > 0.5 ? [1, -1] : [-1, 1];
                    for (const side of sides) {
                        const fx = x + along.dx * side;
                        const fz = z + along.dz * side;
                        if (ctx.isWall(fx, fz)) continue;

                        const backs = [];
                        if (ctx.isWall(fx + along.dx * side, fz + along.dz * side)) {
                            backs.push({dx: along.dx * side, dz: along.dz * side});
                        }
                        for (const s of [1, -1]) {
                            if (ctx.isWall(fx + across.dx * s, fz + across.dz * s)) {
                                backs.push({dx: across.dx * s, dz: across.dz * s});
                            }
                        }
                        if (!backs.length) continue;

                        const back = backs.length > 1 && random() > 0.62
                            ? backs[1 + Math.floor(random() * (backs.length - 1))]
                            : backs[0];
                        if (placeArchWaitingArea(env, ctx, fx, fz, back.dx, back.dz)) break;
                    }
                }
            }
        }
    };
};
