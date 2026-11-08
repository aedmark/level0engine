// Twitch chat as untrusted input (P5-05, D-011). Pure functions and small state machines with no DOM and
// no network, so the test can pin them. Chat text only ever selects one of a few fixed commands; it is
// never displayed, and neither are viewer names (a streamer cannot vet either on air).

export const MAX_LINE = 2048;
export const MAX_MESSAGE = 200;

// Twitch logins: 4 to 25 letters, digits or underscores. We accept 3 for older accounts.
export function isValidChannel(name) {
    return typeof name === 'string' && /^[A-Za-z0-9_]{3,25}$/.test(name);
}

// One IRC line (Twitch flavour, with optional @tags) into its parts. Returns null for anything malformed.
export function parseIrcLine(line) {
    if (typeof line !== 'string' || !line || line.length > MAX_LINE) return null;
    let rest = line;
    const tags = {};
    if (rest[0] === '@') {
        const sp = rest.indexOf(' ');
        if (sp < 0) return null;
        for (const pair of rest.slice(1, sp).split(';')) {
            const eq = pair.indexOf('=');
            if (eq > 0) tags[pair.slice(0, eq)] = pair.slice(eq + 1);
        }
        rest = rest.slice(sp + 1);
    }
    let prefix = null;
    if (rest[0] === ':') {
        const sp = rest.indexOf(' ');
        if (sp < 0) return null;
        prefix = rest.slice(1, sp);
        rest = rest.slice(sp + 1);
    }
    const colon = rest.indexOf(' :');
    const head = colon >= 0 ? rest.slice(0, colon) : rest;
    const text = colon >= 0 ? rest.slice(colon + 2) : null;
    const parts = head.split(' ').filter(Boolean);
    if (!parts.length) return null;
    return {tags, prefix, command: parts[0], params: parts.slice(1), text};
}

// The commands chat may send. Anything else is ignored.
export function parseCommand(text, optionCount = 3) {
    if (typeof text !== 'string') return null;
    const t = text.trim().toLowerCase();
    if (!t.startsWith('!') || t.length > MAX_MESSAGE) return null;
    const m = t.match(/^!(?:vote\s+)?(\d)\b/);
    if (m) {
        const n = Number(m[1]);
        return n >= 1 && n <= optionCount ? {type: 'vote', option: n - 1} : null;
    }
    const word = t.slice(1).split(/\s+/)[0];
    if (word === 'blackout') return {type: 'event', name: 'blackout'};
    if (word === 'lure') return {type: 'event', name: 'lure'};
    return null;
}

// One vote per viewer; a later vote replaces an earlier one.
export class VoteTally {
    constructor(optionCount = 3) {
        this.reset(optionCount);
    }

    reset(optionCount = this.optionCount) {
        this.optionCount = optionCount;
        this.byUser = new Map();
    }

    add(userId, option) {
        if (!userId || option < 0 || option >= this.optionCount) return;
        this.byUser.set(userId, option);
    }

    counts() {
        const c = new Array(this.optionCount).fill(0);
        for (const o of this.byUser.values()) c[o]++;
        return c;
    }

    get total() {
        return this.byUser.size;
    }

    // The option with the most votes, or null with no votes or a tie at the top.
    leader() {
        const c = this.counts();
        let best = -1, bestN = 0, tied = false;
        c.forEach((n, i) => {
            if (n > bestN) { best = i; bestN = n; tied = false; } else if (n === bestN && n > 0) tied = true;
        });
        return bestN > 0 && !tied ? best : null;
    }
}

export const EVENT_RULES = {
    window: 30,        // seconds a request stays counted
    activeWindow: 120, // seconds a chatter counts as active
    minVotes: 3,       // never fewer distinct viewers than this
    fraction: 0.1,     // or this share of active chatters, whichever is larger
    cooldown: 120      // seconds between any two chat events
};

// Chat events fire when enough distinct viewers ask within a window, then everything cools down. A
// threshold that scales with active chatters keeps one viewer, or a small raid, from driving the run.
export class EventGate {
    constructor(names, rules = EVENT_RULES) {
        this.rules = rules;
        this.requests = new Map(names.map(n => [n, new Map()]));
        this.active = new Map();
        this.cooldownUntil = 0;
    }

    seen(userId, now) {
        if (userId) this.active.set(userId, now);
    }

    request(userId, name, now) {
        const reqs = this.requests.get(name);
        if (!reqs || !userId) return;
        this.seen(userId, now);
        reqs.set(userId, now);
    }

    _prune(now) {
        for (const [id, t] of this.active) if (now - t > this.rules.activeWindow) this.active.delete(id);
        for (const reqs of this.requests.values()) {
            for (const [id, t] of reqs) if (now - t > this.rules.window) reqs.delete(id);
        }
    }

    threshold(now) {
        this._prune(now);
        return Math.max(this.rules.minVotes, Math.ceil(this.active.size * this.rules.fraction));
    }

    progress(name, now) {
        const need = this.threshold(now);
        const reqs = this.requests.get(name);
        return {have: reqs ? reqs.size : 0, need};
    }

    cooldownLeft(now) {
        return Math.max(0, this.cooldownUntil - now);
    }

    // Returns the event to fire now, if any, and starts the cooldown. `allowed(name)` lets the game veto
    // an event (during the opening, or a lure while the Anomaly is in its grace period).
    poll(now, allowed = () => true) {
        if (now < this.cooldownUntil) return null;
        const need = this.threshold(now);
        for (const [name, reqs] of this.requests) {
            if (reqs.size >= need && allowed(name)) {
                for (const r of this.requests.values()) r.clear();
                this.cooldownUntil = now + this.rules.cooldown;
                return name;
            }
        }
        return null;
    }
}
