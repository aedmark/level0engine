/**
 * A single, procedurally-drawn ambient reflection environment, generated once at boot
 * and applied to a deliberately short, explicit list of large singleton materials
 * (floors, fixture housings, a few sector wall panels) — see SAFE_MATERIAL_KEYS below
 * for exactly which, and why the list stops there rather than covering everything
 * metallic.
 *
 * The problem this replaces: metallic materials had no light source to reflect except
 * the level's own point/spot fixtures, of which only a fixed pool of 6 (LumenGrid.
 * maxShadowLights) ever cast shadows. Every other fixture's specular contribution
 * ignored geometry entirely, so a metal surface would show a small, hard, unoccluded
 * highlight that visibly "leaked" through the wall the light was actually behind — and
 * with nothing else for a shiny surface to catch, that hotspot was the only reflection
 * information on screen, reading as everything being dipped in plexiglass rather than
 * having a nuanced, ambient sheen.
 *
 * The fix does not touch the light rig or the shadow budget. It gives metal something
 * else to reflect: a soft, low-frequency gradient standing in for "the room in general"
 * — dark toward the floor, mid-tone at wall height, warm and a little brighter toward
 * the ceiling — with no hard shapes baked in anywhere, so it can't reintroduce the same
 * hotspot problem inside its own texture. THREE.PMREMGenerator pre-filters it once per
 * roughness level, so every material samples an already-correctly-blurred version
 * instead of the renderer doing that work live. It does not stop a fixture's own direct
 * specular from crossing a wall — that is a property of the direct light term, which an
 * env map doesn't touch — but it does mean that isn't the *only* thing a metal surface
 * has to show, which is most of what read as wrong.
 *
 * No external image is involved, in keeping with the rest of this engine: the source
 * equirectangular map is drawn on a canvas the same way every other texture here is.
 */
export default class AmbientEnvMap {
    /** @param {THREE.WebGLRenderer} renderer */
    static generate(renderer) {
        const width = 512, height = 256;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Kept deliberately dark. A floor's surface normal points straight up, so it
        // samples almost nothing but the zenith stop below, at close to full strength,
        // regardless of its own roughness — an env map's diffuse/irradiance contribution
        // isn't gated by roughness the way its specular one is, so even a fully rough,
        // barely-metallic floor (clinicFloorMat: roughness 1.0, metalness 0.12) picks up
        // a flat, distance-independent glow from this. The first version of this
        // gradient was bright enough that the glow it added to every floor exceeded the
        // brightness of the actual fixture lighting it — and since it doesn't fall off
        // with distance from a light the way real diffuse illumination does, it read as
        // a light source with no regard for the wall or fixture actually nearby.
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#3d3a30');
        grad.addColorStop(0.35, '#38383c');
        grad.addColorStop(0.65, '#2c2c2f');
        grad.addColorStop(1, '#141312');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // A handful of wide, heavily-feathered brightenings near the top imply
        // scattered ceiling fixtures as a general glow — never a hard edge, so nothing
        // here can itself become the hotspot this whole map exists to avoid. Each one
        // is drawn twice, wrapped across the seam, so the map tiles cleanly. Low alpha
        // for the same reason as the darker base gradient above: these sit directly
        // under every up-facing floor normal in the level.
        let seed = 0x9b1f2a4d;
        const rand = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const glow = (x, y, r) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255, 248, 214, 0.10)');
            g.addColorStop(1, 'rgba(255, 248, 214, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        };
        for (let i = 0; i < 6; i++) {
            const x = rand() * width;
            const y = height * (0.05 + rand() * 0.2);
            const r = width * (0.12 + rand() * 0.10);
            glow(x, y, r);
            glow(x > width / 2 ? x - width : x + width, y, r);
        }

        const source = new THREE.CanvasTexture(canvas);
        source.mapping = THREE.EquirectangularReflectionMapping;
        if ('colorSpace' in source) {
            source.colorSpace = THREE.SRGBColorSpace;
        } else {
            source.encoding = THREE.sRGBEncoding;
        }

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envMap = pmremGenerator.fromEquirectangular(source).texture;
        pmremGenerator.dispose();
        source.dispose();

        return envMap;
    }

    /**
     * The only materials allowed to receive the env map: large, singleton, sector-
     * level surfaces that are used exactly as they are, everywhere they appear, and
     * never `.clone()`d for a per-instance recolour.
     *
     * That second property is the one that matters. Applying this to any metallic
     * material with real coverage sounds like the more thorough fix, and an earlier
     * version of this did exactly that — but dozens of blueprint files clone a shared
     * metal material (env.metalMat, env.paintedSteelMat, env.rustMat, ...) to give one
     * prop its own tinted variant, and every such clone is a *brand new* material
     * object THREE has never compiled a program for. Assigning envMap to the shared
     * template doesn't warm those future clones; ShaderWarmup only knows about
     * materials that already exist at boot. Each clone still gets discovered and
     * compiled the moment a chunk containing it streams in — that already happened
     * before this feature existed — but an envMap-bearing shader costs measurably more
     * to compile+link per occurrence than the plain version, and there are enough such
     * clones in the chunks immediately around spawn alone (~150, measured) that boot
     * time went from ~8s to ~17s the one time this list was "every metallic material"
     * instead of this one.
     *
     * Named explicitly rather than filtered by convention (e.g. "ends in FloorMat")
     * because the failure mode of getting this wrong is silent and expensive — a
     * material added here that turns out to be cloned somewhere doesn't error, it just
     * quietly reintroduces the boot regression. Extend it by grepping first:
     * `grep -rn "\.clone()" src` for the candidate's env field name:
     * anything found means it stays off this list.
     */
    static SAFE_MATERIAL_KEYS = [
        // Floors — one instance each, laid once per sector, never recoloured.
        'tileMat', 'archiveFloorMat', 'serverFloorMat', 'atriumFloorMat',
        'clinicFloorMat', 'incinFloorMat', 'annexFloorMat', 'checkpointFloorMat',
        'diamondPlateMat',
        // Fixture housings.
        'baseHousingMat',
        // Large sector wall/ceiling panels.
        'incinCeilingMat', 'clinicCeilingMat', 'clinicWallMat'
    ];

    /**
     * Assigns the given env map to whichever of SAFE_MATERIAL_KEYS exist on `env`
     * and have real metalness. Must run before ShaderWarmup's compile pass: setting
     * `envMap` changes a material's compiled shader permutation, so applying it after
     * warmup would leave it to compile that permutation cold on first sight —
     * precisely the class of stall the boot-warmup work earlier this session exists
     * to prevent.
     *
     * @returns {number} how many materials it touched, for logging.
     */
    static applyToMaterials(env, envMap, intensity = 0.2) {
        let count = 0;
        for (const key of AmbientEnvMap.SAFE_MATERIAL_KEYS) {
            const mat = env[key];
            if (mat && mat.isMaterial && mat.metalness > 0.1) {
                mat.envMap = envMap;
                mat.envMapIntensity = intensity;
                mat.needsUpdate = true;
                count++;
            }
        }
        return count;
    }
}
