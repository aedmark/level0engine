// EntityManager.js
// Level 0 Engine: The Entity Manager

import Anomaly from './Anomaly.js';
import ArchivistEntity from './ArchivistEntity.js';
import WardenEntity from './WardenEntity.js';
import IncineratorEntity from './IncineratorEntity.js';
import BackupDaemonEntity from './BackupDaemonEntity.js';

/**
 * Orchestrates the spawning, despawning, and updating of all active entities
 * based on the player's current sector. Ensures only one entity type is active at a time.
 */
export default class EntityManager {
    /**
     * Initializes the entity manager and instantiates all unique entity types.
     * @param {THREE.Scene} scene - The main Three.js scene.
     * @param {THREE.PerspectiveCamera} camera - The main camera.
     * @param {Player} player - The player controller instance.
     * @param {Environment} environment - The main environment instance.
     */
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.environment = environment;
        this.entities = {
            'DEFAULT': new Anomaly(scene, camera, player, environment),
            'ARCHIVE': new ArchivistEntity(scene, camera, player, environment),
            'IMPOUND': new WardenEntity(scene, camera, player, environment),
            'INCINERATOR': new IncineratorEntity(scene, camera, player, environment),
            'SERVER': new BackupDaemonEntity(scene, camera, player, environment)
        };
        // Deactivate every entity up front so their initial hidden state matches whatever
        // update() will do later. Prefer each entity's own deactivate() (Warden/Archivist/
        // Incinerator: hides body meshes + zeroes light intensity, but leaves `group` and its
        // light permanently in the scene graph -- see WardenEntity.deactivate() for why) and
        // fall back to hiding the whole group for anything that doesn't define one (Anomaly has
        // no light of its own, so there's no shader-recompile cost to hiding its group outright).
        for (let key in this.entities) {
            const entity = this.entities[key];
            if (typeof entity.deactivate === 'function') {
                entity.deactivate();
            } else if (entity.group) {
                entity.group.visible = false;
            }
        }
        this.activeType = null;
        this.activeEntity = null;
    }

    /**
     * Updates the active entity and handles sector-based entity transitions.
     * @param {number} delta - Time elapsed since the last frame (in seconds).
     * @param {number} time - Total elapsed time.
     * @param {string} activeSector - The player's current sector identifier.
     * @returns {Object|null} Any UI state or jump scare state triggered by the active entity.
     */
    update(delta, time, activeSector) {
        let targetType = 'DEFAULT';
        if (activeSector === 'ARCHIVE') {
            targetType = 'ARCHIVE';
        } else if (activeSector === 'IMPOUND') {
            targetType = 'IMPOUND';
        } else if (activeSector === 'INCINERATOR') {
            targetType = 'INCINERATOR';
        } else if (activeSector === 'SERVER') {
            targetType = 'SERVER';
        }
        if (this.activeType !== targetType) {
            if (this.activeEntity) {
                // See the constructor's comment above: deactivate() (where defined) hides the
                // entity without touching `group`, so its light stays in the scene's active
                // light list -- just dark -- instead of popping out and forcing a shader
                // recompile across every standard-lit material in the scene the instant the
                // player crosses into or out of a sector like Impound or Archive.
                if (typeof this.activeEntity.deactivate === 'function') {
                    this.activeEntity.deactivate();
                } else {
                    this.activeEntity.isActive = false;
                    if (this.activeEntity.group) this.activeEntity.group.visible = false;
                }
            }
            this.activeType = targetType;
            this.activeEntity = this.entities[targetType];
            if (this.activeEntity) {
                this.activeEntity.isActive = true;
                const spawnAngle = Math.random() * Math.PI * 2;
                this.activeEntity.reset(
                    this.camera.position.x + Math.cos(spawnAngle) * 50,
                    0,
                    this.camera.position.z + Math.sin(spawnAngle) * 50
                );
            }
        }
        if (this.activeEntity) {
            // Only Anomaly actually reads this 3rd argument (to suppress itself while the player
            // is inside any sector it doesn't own); Warden/Archivist/Incinerator's own update()
            // signatures just ignore it.
            return this.activeEntity.update(delta, time, activeSector);
        }
        return null;
    }
}