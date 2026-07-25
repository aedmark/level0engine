// EntityManager.js
// Level 0 Engine: The Entity Manager

import Anomaly from './Anomaly.js';
import ArchivistEntity from './ArchivistEntity.js';
import WardenEntity from './WardenEntity.js';

export default class EntityManager {
    constructor(scene, camera, player, environment) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        this.environment = environment;
        this.entities = {
            'DEFAULT': new Anomaly(scene, camera, player, environment),
            'ARCHIVE': new ArchivistEntity(scene, camera, player, environment),
            'IMPOUND': new WardenEntity(scene, camera, player, environment)
        };
        this.activeType = null;
        this.activeEntity = null;
    }

    update(delta, time, activeSector) {
        let targetType = 'DEFAULT';
        if (activeSector === 'ARCHIVE') {
            targetType = 'ARCHIVE';
        } else if (activeSector === 'IMPOUND') {
            targetType = 'IMPOUND';
        }
        if (this.activeType !== targetType) {
            if (this.activeEntity) {
                this.activeEntity.isActive = false;
                if (this.activeEntity.group) this.activeEntity.group.visible = false;
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
            return this.activeEntity.update(delta, time);
        }
        return null;
    }
}