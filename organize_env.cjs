const fs = require('fs');

const path = './src/core/Environment.js';
const code = fs.readFileSync(path, 'utf8');

const classStartMatch = code.match(/export default class Environment\s*\{/);
if (!classStartMatch) {
    console.error("Could not find class Environment start");
    process.exit(1);
}

const header = code.substring(0, classStartMatch.index + classStartMatch[0].length);

let braceCount = 1;
let bodyEndIdx = -1;
const bodyStartIndex = classStartMatch.index + classStartMatch[0].length;

for (let i = bodyStartIndex; i < code.length; i++) {
    if (code[i] === '{') braceCount++;
    if (code[i] === '}') braceCount--;
    if (braceCount === 0) {
        bodyEndIdx = i;
        break;
    }
}

const bodyStr = code.substring(bodyStartIndex, bodyEndIdx);
const footer = code.substring(bodyEndIdx);

const knownMethods = [
    "constructor", "setup", "updateChunks", "processChunkQueue", "buildChunk", 
    "updateInteractives", "updateEntity", "updateLights", "generate", 
    "_generateSectorMaze", "_compileInstances", "_createChunkHelpers",
    "_buildEntranceHallways", "_buildAirlock", "_buildHallwaySegment", "_buildCheckpointRoom", 
    "_buildCheckpointColumn", "_buildImpoundItem", "_updateSliderDoor", "_updateAirlockDoor", 
    "_updateAirlock", "shatterFixture", "_rollHuntHops", "_cacheGeo", "_boxGeo", 
    "_planeGeo", "_sectorFog", "captureAsset"
];

let methodMap = new Map();

for (const name of knownMethods) {
    // Look for method signature exactly matching the name, optionally preceded by "get " or "async "
    const regexStr = `^\\s*(?:get\\s+|async\\s+)?${name}\\s*\\([^)]*\\)\\s*\\{`;
    const regex = new RegExp(regexStr, 'm');
    const match = bodyStr.match(regex);
    
    if (match) {
        let startIdx = match.index;
        
        let depth = 0;
        let foundStart = false;
        let endIdx = startIdx;
        
        for (let j = startIdx; j < bodyStr.length; j++) {
            if (bodyStr[j] === '{') {
                depth++;
                foundStart = true;
            } else if (bodyStr[j] === '}') {
                depth--;
            }
            if (foundStart && depth === 0) {
                endIdx = j + 1;
                break;
            }
        }
        
        let methodCode = bodyStr.substring(startIdx, endIdx);
        methodMap.set(name, methodCode);
    } else {
        console.warn(`Could not find method: ${name}`);
    }
}

// Rebuild the class
const categories = {
    "LIFECYCLE & INITIALIZATION": [
        "constructor", "setup"
    ],
    "CORE LOOPS & STATE": [
        "updateChunks", "processChunkQueue", "buildChunk", "updateInteractives", "updateEntity", "updateLights"
    ],
    "PROCEDURAL GENERATION PIPELINE": [
        "generate", "_generateSectorMaze", "_compileInstances", "_createChunkHelpers"
    ],
    "SECTOR GEOMETRY BUILDERS": [
        "_buildEntranceHallways", "_buildAirlock", "_buildHallwaySegment", "_buildCheckpointRoom", "_buildCheckpointColumn", "_buildImpoundItem"
    ],
    "INTERACTIVE LOGIC": [
        "_updateSliderDoor", "_updateAirlockDoor", "_updateAirlock", "shatterFixture", "_rollHuntHops"
    ],
    "MATH & UTILITIES": [
        "_cacheGeo", "_boxGeo", "_planeGeo", "_sectorFog", "captureAsset"
    ]
};

let newBody = "\n";

const docStrings = {
    "generate": "    /**\n     * Triggers the procedural generation pipeline. Builds the environment, distributes light fixtures,\n     * and spawns interactive elements.\n     * @param {boolean} isWarp - True if the player is being warped across coordinates.\n     */",
    "updateChunks": "    /**\n     * The core spatial-hashing update loop. Triggers chunk loading/unloading dynamically\n     * based on player proximity. Discards stale chunks to maintain 60fps.\n     * @param {THREE.Vector3} playerPos - The current camera position.\n     */",
    "updateLights": "    /**\n     * Evaluates spatial grid chunks to determine active sector, blends sector fog,\n     * and modulates light intensity or triggers random breaker/flicker events.\n     * @param {number} time - Global runtime elapsed.\n     */",
    "updateEntity": "    /**\n     * Routes entity tick commands to the EntityManager based on the sticky sector.\n     */"
};

for (const [category, methods] of Object.entries(categories)) {
    newBody += `    // ==========================================\n`;
    newBody += `    // ${category}\n`;
    newBody += `    // ==========================================\n\n`;
    
    for (const name of methods) {
        if (methodMap.has(name)) {
            if (docStrings[name]) {
                newBody += docStrings[name] + "\n";
            }
            newBody += methodMap.get(name) + "\n\n";
        }
    }
}

// check if there is an anomaly getter
const anomalyGetterMatch = bodyStr.match(/^\s*get\s+anomaly\s*\([^)]*\)\s*\{/m);
if (anomalyGetterMatch) {
    let startIdx = anomalyGetterMatch.index;
    let depth = 0;
    let foundStart = false;
    let endIdx = startIdx;
    
    for (let j = startIdx; j < bodyStr.length; j++) {
        if (bodyStr[j] === '{') {
            depth++;
            foundStart = true;
        } else if (bodyStr[j] === '}') {
            depth--;
        }
        if (foundStart && depth === 0) {
            endIdx = j + 1;
            break;
        }
    }
    
    // We'll just stick it in LIFECYCLE
    const code = bodyStr.substring(startIdx, endIdx);
    newBody = newBody.replace("// ==========================================\n\n", "// ==========================================\n\n" + code + "\n\n");
}

const finalCode = header + newBody + footer;
fs.writeFileSync(path, finalCode, 'utf8');

console.log("Successfully rebuilt Environment.js!");
