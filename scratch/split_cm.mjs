import fs from 'fs';
const code = fs.readFileSync('src/world/ChunkManager.js', 'utf8');

function extractMethod(methodName) {
    const regex = new RegExp(`^\\s*(async |static )?${methodName}\\([\\s\\S]*?\\n    }\\n`, 'm');
    const match = code.match(regex);
    return match ? match[0] : null;
}

// 1. ChunkStreamer
const streamerMethods = ['updateChunks', '_pruneDeadChunkEntries', 'processChunkQueue', '_asyncDisposeChunks'];

// 2. ChunkBuilder
const builderMethods = ['buildChunk', '_buildChunkInterior', '_buildEmptyCell', 'beginMacroChunkContent', 'isMacroChunkContentReady', '_compileInstances'];

// 3. ShaderWarmup
const warmupMethods = ['warmChunkMaterials', 'queueShadowPrewarm', '_shadowProbeRig', 'drainShadowPrewarm', 'warmMaterialVariants', '_unwarmedMaterials', '_scopedCompile', '_drainProgramLinks', '_forgetMaterialPrograms'];

// 4. AirlockAprons
const airlockMethods = ['_airlockApron', '_isAirlockApron'];

// 5. Profiling and debug
const profDebugMethods = ['_profBegin', '_profAdd', '_profEnd', '_getDebugLabelMaterial', '_addDebugCellLabel'];

console.log("Streamer:", streamerMethods.every(m => extractMethod(m)));
console.log("Builder:", builderMethods.every(m => extractMethod(m)));
console.log("Warmup:", warmupMethods.every(m => extractMethod(m)));
console.log("Airlock:", airlockMethods.every(m => extractMethod(m)));
console.log("Prof:", profDebugMethods.every(m => extractMethod(m)));

