// AABB.js
// LEVEL 0 HOMEGROWN MATH
//
// Axis-aligned bounding box — the collision half of what THREE.Box3 was
// doing for PlayerController.js and Anomaly.js. Deliberately does not
// implement setFromObject(): that needs geometry + matrixWorld reads,
// which still live on the three.js side of the boundary (Environment.js,
// TheArchitect.js). Those files build boxes with setFromObject and hand
// them to the spatial grid as plain THREE.Box3 instances — this class
// only ever reads .min/.max off them, so the two live side by side without
// coupling.

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

    // Ray-box intersection via the slab method. origin/direction are any
    // {x,y,z}; box is any {min,max} — homegrown AABB or THREE.Box3, doesn't
    // matter, only properties are read. Mirrors THREE.Ray.intersectBox:
    // returns false (and leaves target untouched) on a miss or when the
    // box is entirely behind the ray's origin.
    static rayIntersectsBox(origin, direction, box, target) {
        let tmin = -Infinity;
        let tmax = Infinity;
        const o = [origin.x, origin.y, origin.z];
        const d = [direction.x, direction.y, direction.z];
        const bmin = [box.min.x, box.min.y, box.min.z];
        const bmax = [box.max.x, box.max.y, box.max.z];
        for (let i = 0; i < 3; i++) {
            if (Math.abs(d[i]) < 1e-12) {
                if (o[i] < bmin[i] || o[i] > bmax[i]) return false;
                continue;
            }
            let t1 = (bmin[i] - o[i]) / d[i];
            let t2 = (bmax[i] - o[i]) / d[i];
            if (t1 > t2) {
                const tmp = t1;
                t1 = t2;
                t2 = tmp;
            }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) return false;
        }
        if (tmax < 0) return false;
        const t = tmin >= 0 ? tmin : tmax;
        if (target) target.set(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t);
        return true;
    }
}
