import './setup.js';
import test from 'node:test';
import assert from 'node:assert';

test('THREE is available globally', () => {
    assert.strictEqual(typeof globalThis.THREE.Vector3, 'function');
    
    const vec = new THREE.Vector3(1, 2, 3);
    assert.strictEqual(vec.x, 1);
    assert.strictEqual(vec.y, 2);
    assert.strictEqual(vec.z, 3);
    
    vec.add(new THREE.Vector3(1, 1, 1));
    assert.strictEqual(vec.x, 2);
    
    // To fail this test on purpose:
    // assert.strictEqual(vec.x, 999);
});
