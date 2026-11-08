// Per-run values that used to come from Math.random() and made a shared seed play differently
// for each player. Pure functions of the seed so the P2-02 test can pin them (D-008).

export function deriveRunSalt(baseSeed) {
    return Math.imul((baseSeed | 0) ^ 0x5bd1e995, 0x27d4eb2d) >>> 0;
}

export function deriveHuntState(baseSeed) {
    return ((baseSeed | 0) ^ 0x68e31da4) >>> 0;
}

// Advances the hunt stream one step; returns the hop count (0-2) and the new state.
export function nextHuntHops(state) {
    const next = (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
    const r = next / 4294967296.0;
    return {hops: r < 0.10 ? 0 : (r < 0.60 ? 1 : 2), state: next};
}
