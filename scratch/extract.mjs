import fs from 'fs';
const code = fs.readFileSync('src/world/ChunkManager.js', 'utf8');

function extractMethod(methodName) {
    const regex = new RegExp(`^\\s*(async |static )?${methodName}\\([\\s\\S]*?\\n    }\\n`, 'm');
    const match = code.match(regex);
    if (match) return match[0];
    return null;
}

const methods = [
    'updateChunks', '_pruneDeadChunkEntries', 'processChunkQueue', '_asyncDisposeChunks',
    'buildChunk', '_buildChunkInterior', '_airlockApron', '_isAirlockApron',
    '_getDebugLabelMaterial', '_addDebugCellLabel', '_buildEmptyCell',
    'beginMacroChunkContent', 'isMacroChunkContentReady', '_compileInstances',
    'warmChunkMaterials', 'queueShadowPrewarm', '_shadowProbeRig', 'drainShadowPrewarm',
    'warmMaterialVariants', '_unwarmedMaterials', '_scopedCompile', '_drainProgramLinks',
    '_forgetMaterialPrograms'
];

methods.forEach(m => {
    const fn = extractMethod(m);
    if (!fn) console.log('MISSING:', m);
});
