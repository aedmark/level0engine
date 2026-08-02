import TextureMechanics from './textures/TextureMechanics.js';
import StructuralTextures from './textures/common/StructuralTextures.js';
import SurfaceTextures from './textures/common/SurfaceTextures.js';
import ClinicTextures from './textures/sectors/ClinicTextures.js';
import AtriumTextures from './textures/sectors/AtriumTextures.js';
import OrganicTextures from './textures/common/OrganicTextures.js';
import TechTextures from './textures/common/TechTextures.js';
import HazardTextures from './textures/common/HazardTextures.js';
import PropTextures from './textures/common/PropTextures.js';
import AnnexTextures from './textures/sectors/AnnexTextures.js';
import ImpoundTextures from './textures/sectors/ImpoundTextures.js';
import BoardroomTextures from './textures/sectors/BoardroomTextures.js';
import MaintenanceTextures from './textures/sectors/MaintenanceTextures.js';
import ArchiveTextures from './textures/sectors/ArchiveTextures.js';
import CheckpointTextures from './textures/sectors/CheckpointTextures.js';
import IncineratorTextures from './textures/sectors/IncineratorTextures.js';
import ExtendedTextures from './textures/sectors/ExtendedTextures.js';

export default class ProceduralTextureFactory {
    static async generateAssets() {
        const masterNoise = TextureMechanics._generateMasterNoise();
        const extras = {
            pegboardTex: PropTextures.generatePegboardTexture(),
        };
        const structAssets = StructuralTextures._buildStructuralAssets(masterNoise);
        await TextureMechanics._yield();
        const surfaceAssets = SurfaceTextures._buildSurfaceAssets(masterNoise);
        await TextureMechanics._yield();
        const organicAssets = OrganicTextures._buildOrganicAssets(masterNoise);
        await TextureMechanics._yield();
        const techAssets = TechTextures._buildTechAssets(masterNoise);
        await TextureMechanics._yield();
        const hazardAssets = HazardTextures._buildHazardAndMiscAssets(masterNoise);
        await TextureMechanics._yield();
        const annexAssets = AnnexTextures._buildAnnexAssets(masterNoise);
        await TextureMechanics._yield();
        const impoundAssets = ImpoundTextures._buildImpoundAssets(masterNoise);
        await TextureMechanics._yield();
        const boardroomAssets = BoardroomTextures._buildBoardroomAssets(masterNoise);
        await TextureMechanics._yield();
        const atriumAssets = AtriumTextures._buildAtriumAssets(masterNoise);
        await TextureMechanics._yield();
        const maintenanceAssets = MaintenanceTextures._buildMaintenanceAssets(masterNoise);
        await TextureMechanics._yield();
        const archiveAssets = ArchiveTextures._buildArchiveAssets(masterNoise);
        await TextureMechanics._yield();
        const checkpointAssets = CheckpointTextures._buildCheckpointAssets(masterNoise);
        await TextureMechanics._yield();
        const extendedAssets = ExtendedTextures._buildExtendedAssets(masterNoise);
        const assets = {
            ...extras,
            ...structAssets,
            ...surfaceAssets,
            ...organicAssets,
            ...techAssets,
            ...hazardAssets,
            ...annexAssets,
            ...impoundAssets,
            ...boardroomAssets,
            ...atriumAssets,
            ...maintenanceAssets,
            ...archiveAssets,
            ...checkpointAssets,
            ...extendedAssets
        };
        const markSRGB = (texture) => {
            if ('colorSpace' in texture) {
                texture.colorSpace = THREE.SRGBColorSpace;
            } else {
                texture.encoding = THREE.sRGBEncoding;
            }
        };
        const isNonColorData = (key) => /Bump|Rough|Normal|Displacement/.test(key);
        const applyOpt = (item, key) => {
            if (item && item.isTexture) {
                item.anisotropy = 16;
                if (!isNonColorData(key || '')) markSRGB(item);
            }
            if (item && item.map && item.map.isTexture) {
                item.map.anisotropy = 16;
                markSRGB(item.map);
            }
            if (item && item.emissiveMap && item.emissiveMap.isTexture) {
                item.emissiveMap.anisotropy = 16;
                markSRGB(item.emissiveMap);
            }
            for (const slot of ['bumpMap', 'roughnessMap']) {
                if (item && item[slot] && item[slot].isTexture) {
                    item[slot].anisotropy = 16;
                }
            }
        };
        Object.entries(assets).forEach(([key, item]) => {
            if (Array.isArray(item)) {
                item.forEach(sub => applyOpt(sub, key));
            } else {
                applyOpt(item, key);
            }
        });
        return assets;
    }
}
