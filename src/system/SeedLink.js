// Seeds that travel by link (P5-03). The seed text is the whole run (D-008), so a link is enough to
// put a viewer on the same murder as the streamer. Pure functions, so the test can pin them.

const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const MAX_SEED_LENGTH = 64;
export const DAILY_KEYWORD = 'daily';

function deck() {
    const cards = [];
    for (const suit of SUITS) for (const rank of RANKS) cards.push(`${rank}${suit}`);
    return cards;
}

// The UTC date, so everyone on the same calendar day in UTC gets the same daily seed wherever they are.
export function utcDateKey(date) {
    return date.toISOString().slice(0, 10);
}

// A card hand like the default seed, dealt from a deck shuffled by the date. Same shape as
// SaveManager.generateCardSeed so a daily seed looks like any other run.
export function dailySeed(date) {
    const key = utcDateKey(date);
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
    let state = h >>> 0;
    const rand = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296.0;
    };
    const cards = deck();
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards.slice(0, 5).join('|');
}

// The URL is untrusted input: trim, drop control characters and cap the length. The value only
// ever reaches an <input>.value and the seed hash, never innerHTML.
export function sanitizeSeed(raw) {
    if (typeof raw !== 'string') return null;
    // eslint-disable-next-line no-control-regex
    const clean = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_SEED_LENGTH);
    return clean.length ? clean : null;
}

// Returns the seed a page was opened with (?seed=...), resolving ?seed=daily against `date`.
export function seedFromSearch(search, date) {
    const value = new URLSearchParams(search).get('seed');
    const seed = sanitizeSeed(value);
    if (!seed) return null;
    return seed.toLowerCase() === DAILY_KEYWORD ? dailySeed(date) : seed;
}

// Blackouts append " NULL" and ascensions " FL-n" to the live seed (main.js). A shared link names
// the run, so it carries the seed the run started from.
export function runSeed(liveSeed) {
    let s = String(liveSeed || '');
    for (;;) {
        const next = s.replace(/ (NULL|FL-\d+)$/, '');
        if (next === s) return s;
        s = next;
    }
}

export function shareUrl(baseHref, seed) {
    const url = new URL('terminal.html', baseHref);
    url.search = '';
    url.hash = '';
    url.searchParams.set('seed', seed);
    return url.toString();
}
