// Vec3.js
// LEVEL 0 HOMEGROWN MATH
//
// A minimal 3D vector, built to match the exact method surface
// PlayerController.js and Anomaly.js use — nothing speculative bolted on.
//
// It duck-types freely against THREE.Vector3 (and anything else exposing
// x/y/z): every method reads plain properties off its argument rather than
// checking instanceof. That's the same contract three.js's own Vector3
// uses internally, which is what makes a partial migration possible —
// a Vec3 can sit next to THREE.Vector3 in the same expression without
// either one knowing the other exists.

export default class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    clone() {
        return new Vec3(this.x, this.y, this.z);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    distanceToSquared(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    normalize() {
        const len = this.length();
        if (len > 1e-12) this.multiplyScalar(1 / len);
        return this;
    }

    lerp(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }

    // Rotates this vector by a quaternion-like {x,y,z,w}. Reads properties
    // only, so camera.quaternion (a live THREE.Quaternion) works unmodified —
    // no homegrown Quaternion class needed just to support this one call.
    applyQuaternion(q) {
        const {x, y, z} = this;
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
        const ix = qw * x + qy * z - qz * y;
        const iy = qw * y + qz * x - qx * z;
        const iz = qw * z + qx * y - qy * x;
        const iw = -qx * x - qy * y - qz * z;
        this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
        return this;
    }
}
