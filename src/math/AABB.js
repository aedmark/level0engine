// AABB.js
// LEVEL 0 HOMEGROWN MATH

import Vec3 from './Vec3.js';

export default class AABB {
    constructor(min = new Vec3(Infinity, Infinity, Infinity), max = new Vec3(-Infinity, -Infinity, -Infinity)) {
        this.min = new Vec3(min.x, min.y, min.z);
        this.max = new Vec3(max.x, max.y, max.z);
    }

    set(min, max) {
        this.min.copy(min);
        this.max.copy(max);
        return this;
    }

    copy(box) {
        this.min.copy(box.min);
        this.max.copy(box.max);
        return this;
    }

    makeEmpty() {
        this.min.set(Infinity, Infinity, Infinity);
        this.max.set(-Infinity, -Infinity, -Infinity);
        return this;
    }

    isEmpty() {
        return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }

    intersectsBox(box) {
        return box.max.x >= this.min.x && box.min.x <= this.max.x &&
            box.max.y >= this.min.y && box.min.y <= this.max.y &&
            box.max.z >= this.min.z && box.min.z <= this.max.z;
    }

    static rayIntersectsBox(origin, direction, box, target) {
        let tmin = -Infinity;
        let tmax = Infinity;

        // X axis
        if (Math.abs(direction.x) < 1e-12) {
            if (origin.x < box.min.x || origin.x > box.max.x) return false;
        } else {
            let t1 = (box.min.x - origin.x) / direction.x;
            let t2 = (box.max.x - origin.x) / direction.x;
            if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return false;
        }

        // Y axis
        if (Math.abs(direction.y) < 1e-12) {
            if (origin.y < box.min.y || origin.y > box.max.y) return false;
        } else {
            let t1 = (box.min.y - origin.y) / direction.y;
            let t2 = (box.max.y - origin.y) / direction.y;
            if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return false;
        }

        // Z axis
        if (Math.abs(direction.z) < 1e-12) {
            if (origin.z < box.min.z || origin.z > box.max.z) return false;
        } else {
            let t1 = (box.min.z - origin.z) / direction.z;
            let t2 = (box.max.z - origin.z) / direction.z;
            if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return false;
        }

        if (tmax < 0) return false;
        const t = tmin >= 0 ? tmin : tmax;
        if (target) target.set(origin.x + direction.x * t, origin.y + direction.y * t, origin.z + direction.z * t);
        return true;
    }
}
