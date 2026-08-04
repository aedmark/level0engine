/**
 * [ROLE] Generates a barricade-like pile of overturned tables and chairs, usually hiding a battery.
 * [WHY] Adds visual storytelling of struggle or blockade, and rewards thorough exploration with hidden items.
 * [STATE] Stateless group builder; adds to global interactable arrays.
 * [DEPENDS] Furniture building context methods and battery prefab.
 */
export const WreckedFurniturePileProfile = (env, ctx) => {
    const {random, buildTable, buildChair, addFurniture, chunkGroup, hash} = ctx;
    return {
        name: "THE WRECKED FURNITURE PILE",
        prob: 0.0215, build: (x, z) => {
            const cx = x * env.cellSize;
            const cz = z * env.cellSize;
            const pile = new THREE.Group();
            const base = buildTable(0, 0, 0);
            base.rotation.x = Math.PI;
            base.rotation.y = random() * Math.PI * 2;
            base.position.y = 0.825;
            pile.add(base);
            const leaner = buildTable(-0.25, 0, 0);
            const leanTip = new THREE.Group();
            leanTip.add(leaner);
            leanTip.rotation.z = -(0.55 + random() * 0.3);
            const leanYaw = new THREE.Group();
            leanYaw.add(leanTip);
            leanYaw.rotation.y = random() * Math.PI * 2;
            leanYaw.position.set((random() - 0.5) * 0.35, 0, (random() - 0.5) * 0.35);
            pile.add(leanYaw);
            for (let i = 0; i < 3; i++) {
                const ang = (i / 3) * Math.PI * 2 + random() * 0.7;
                const r = 0.7 + random() * 0.4;
                const px = Math.cos(ang) * r, pz = Math.sin(ang) * r;
                if (i === 0) {
                    const chair = buildChair(-0.3, 0, 0, random() * Math.PI * 2);
                    const chairTip = new THREE.Group();
                    chairTip.add(chair);
                    chairTip.rotation.z = -(0.45 + random() * 0.25);
                    chairTip.position.set(px, 0, pz);
                    pile.add(chairTip);
                } else {
                    pile.add(buildChair(px, 0, pz, random() * Math.PI * 2));
                }
            }
            pile.position.set(cx, 0, cz);
            addFurniture(pile);
            const batGroup = new THREE.Group();
            const batMesh = env.batteryPrefab.clone();
            batGroup.add(batMesh);
            const bGlow = new THREE.Mesh(env.glowGeo, env.glowMat);
            bGlow.scale.set(0.20, 0.20, 0.20);
            bGlow.position.y = 0.01;
            batGroup.add(bGlow);
            batGroup.position.set(cx, 0.1, cz);
            batGroup.rotation.y = random() * Math.PI;
            batGroup.userData = {type: 'battery', chunkHash: hash, active: true};
            chunkGroup.add(batGroup);
            if (!env.interactables) env.interactables = [];
            env.interactables.push(batGroup);
        }
    };
};
