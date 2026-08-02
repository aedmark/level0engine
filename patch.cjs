const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, 'src/aesthetics/textures');

const patchFile = (relPath, replacements, imports) => {
    const filePath = path.join(dir, relPath);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add imports after the first line (TextureMechanics import)
    if (imports && imports.length > 0) {
        const lines = content.split('\n');
        let insertIdx = 1;
        while (insertIdx < lines.length && lines[insertIdx].startsWith('import ')) insertIdx++;
        
        for (const imp of imports) {
            if (!content.includes(imp)) {
                lines.splice(insertIdx, 0, imp);
                insertIdx++;
            }
        }
        content = lines.join('\n');
    }
    
    // Apply string replacements
    for (const [search, replace] of Object.entries(replacements)) {
        content = content.replaceAll(search, replace);
    }
    
    fs.writeFileSync(filePath, content);
};

// HazardTextures.js
patchFile('common/HazardTextures.js', {
    'this._buildPipeMaterial': 'PropTextures._buildPipeMaterial',
    'this._buildCorrosionBump': 'PropTextures._buildCorrosionBump'
}, [
    "import PropTextures from './PropTextures.js';"
]);

// OrganicTextures.js
patchFile('common/OrganicTextures.js', {
    'this._buildCeilingStainAtlas': 'SurfaceTextures._buildCeilingStainAtlas'
}, [
    "import SurfaceTextures from './SurfaceTextures.js';"
]);

// StructuralTextures.js
patchFile('common/StructuralTextures.js', {
    'this._buildWallpaper': 'SurfaceTextures._buildWallpaper',
    'this._buildWood': 'PropTextures._buildWood',
    'this._buildDoor': 'PropTextures._buildDoor'
}, [
    "import SurfaceTextures from './SurfaceTextures.js';",
    "import PropTextures from './PropTextures.js';"
]);

// SurfaceTextures.js
patchFile('common/SurfaceTextures.js', {
    'this._buildAtriumFloor': 'AtriumTextures._buildAtriumFloor'
}, [
    "import AtriumTextures from '../sectors/AtriumTextures.js';"
]);

// ExtendedTextures.js (inside sectors)
patchFile('sectors/ExtendedTextures.js', {
    'this._buildIncineratorFloor': 'IncineratorTextures._buildIncineratorFloor',
    'this._buildIncineratorWall': 'IncineratorTextures._buildIncineratorWall',
    'this._buildSightGlass': 'IncineratorTextures._buildSightGlass',
    'this._buildEmberGrate': 'IncineratorTextures._buildEmberGrate'
}, [
    "import IncineratorTextures from './IncineratorTextures.js';"
]);

console.log("Patching complete.");
