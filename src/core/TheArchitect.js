// TheArchitect.js
// LEVEL 0 PROCEDURAL BLUEPRINT FACTORY - COORDINATOR

import StructuralBlueprints from '../world/StructuralBlueprints.js';
import SectorBlueprints from '../world/SectorBlueprints.js';

export default class TheArchitect {
    static getStructuralMatrix(ctx) {
        return StructuralBlueprints.getStructuralMatrix.call(this, ctx);
    }
    static getSectorMatrix(ctx) {
        return SectorBlueprints.getSectorMatrix.call(this, ctx);
    }
}
