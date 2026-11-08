import test from 'node:test';
import assert from 'node:assert';
import {dailySeed, utcDateKey, sanitizeSeed, seedFromSearch, runSeed, shareUrl, MAX_SEED_LENGTH} from '../src/system/SeedLink.js';

test('P5-03 daily seed is a stable five-card hand per UTC day', () => {
    const a = new Date('2026-11-07T00:00:01Z');
    const b = new Date('2026-11-07T23:59:59Z');
    const c = new Date('2026-11-08T00:00:00Z');
    assert.strictEqual(utcDateKey(a), '2026-11-07');
    assert.strictEqual(dailySeed(a), dailySeed(b));
    assert.notStrictEqual(dailySeed(a), dailySeed(c));
    const cards = dailySeed(a).split('|');
    assert.strictEqual(cards.length, 5);
    assert.strictEqual(new Set(cards).size, 5);
    for (const card of cards) assert.match(card, /^(A|[2-9]|10|J|Q|K)[♥♦♣♠]$/);
    // A year of days should not collapse onto a handful of hands.
    const hands = new Set();
    for (let d = 0; d < 365; d++) hands.add(dailySeed(new Date(Date.UTC(2026, 0, 1 + d))));
    assert.ok(hands.size > 360);
});

test('P5-03 URL seeds are sanitised and resolve the daily keyword', () => {
    const now = new Date('2026-11-07T12:00:00Z');
    assert.strictEqual(seedFromSearch('?seed=7%E2%99%A0%7CK%E2%99%A5', now), '7♠|K♥');
    assert.strictEqual(seedFromSearch('?seed=DAILY', now), dailySeed(now));
    assert.strictEqual(seedFromSearch('', now), null);
    assert.strictEqual(seedFromSearch('?seed=%20%20', now), null);
    assert.strictEqual(sanitizeSeed('a\u0000b\nc'), 'abc');
    assert.strictEqual(sanitizeSeed('x'.repeat(200)).length, MAX_SEED_LENGTH);
    assert.strictEqual(sanitizeSeed(null), null);
});

test('P5-03 shared links name the run, not the floor or blackout', () => {
    assert.strictEqual(runSeed('7♠|K♥|2♣|9♦|A♠ NULL FL-2 NULL'), '7♠|K♥|2♣|9♦|A♠');
    assert.strictEqual(runSeed('ASYNC RESEARCH INSTITUTE FL-3'), 'ASYNC RESEARCH INSTITUTE');
    assert.strictEqual(runSeed('NULL'), 'NULL', 'a seed that is only the word stays intact');
    const url = new URL(shareUrl('http://localhost:8080/engine.html?logdepth', '7♠|K♥ X'));
    assert.strictEqual(url.pathname, '/terminal.html');
    assert.strictEqual(url.searchParams.get('seed'), '7♠|K♥ X');
    assert.strictEqual([...url.searchParams.keys()].length, 1);
    assert.strictEqual(seedFromSearch(url.search, new Date()), '7♠|K♥ X', 'a shared link round-trips');
});
