// TheArchitect.js
// LEVEL 0 PROCEDURAL BLUEPRINT FACTORY STUB

import StructuralBlueprints from '../world/StructuralBlueprints.js';
import SectorBlueprints from '../world/SectorBlueprints.js';

/**
 * A static facade pattern for retrieving structural and sector blueprints.
 * 
 * Educational Note: The Facade Pattern hides the complexity of the blueprint modules 
 * (`StructuralBlueprints`, `SectorBlueprints`) behind a single, clean interface. When the 
 * Environment generator needs a layout, it just asks "The Architect".
 */
export default class TheArchitect {
    static getStructuralMatrix(ctx) {
        return StructuralBlueprints.getStructuralMatrix.call(this, ctx);
    }
    static getSectorMatrix(ctx) {
        return SectorBlueprints.getSectorMatrix.call(this, ctx);
    }
}
