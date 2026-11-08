import test from 'node:test';
import assert from 'node:assert';
import {parseIrcLine, parseCommand, isValidChannel, VoteTally, EventGate, MAX_MESSAGE} from '../src/system/ChatCommands.js';

test('P5-05 IRC lines parse tags, prefix, command and text', () => {
    const m = parseIrcLine('@badge-info=;display-name=Some_One;user-id=12345 :some_one!some_one@some_one.tmi.twitch.tv PRIVMSG #chan :!vote 2 please');
    assert.strictEqual(m.command, 'PRIVMSG');
    assert.strictEqual(m.tags['user-id'], '12345');
    assert.deepStrictEqual(m.params, ['#chan']);
    assert.strictEqual(m.text, '!vote 2 please');
    assert.strictEqual(parseIrcLine('PING :tmi.twitch.tv').text, 'tmi.twitch.tv');
    assert.strictEqual(parseIrcLine(''), null);
    assert.strictEqual(parseIrcLine('@novalue'), null);
    assert.strictEqual(parseIrcLine('x'.repeat(5000)), null);
});

test('P5-05 only fixed commands are recognised', () => {
    assert.deepStrictEqual(parseCommand('!1'), {type: 'vote', option: 0});
    assert.deepStrictEqual(parseCommand('  !VOTE 3 '), {type: 'vote', option: 2});
    assert.strictEqual(parseCommand('!4'), null, 'only three findings');
    assert.strictEqual(parseCommand('!0'), null);
    assert.strictEqual(parseCommand('!12'), null, 'a two-digit number is not a vote');
    assert.deepStrictEqual(parseCommand('!blackout now'), {type: 'event', name: 'blackout'});
    assert.deepStrictEqual(parseCommand('!Lure'), {type: 'event', name: 'lure'});
    assert.strictEqual(parseCommand('blackout'), null);
    assert.strictEqual(parseCommand('!<script>'), null);
    assert.strictEqual(parseCommand('!1 ' + 'x'.repeat(MAX_MESSAGE)), null, 'overlong messages are ignored');
    assert.strictEqual(parseCommand(null), null);
});

test('P5-05 channel names are validated', () => {
    for (const ok of ['xqc', 'Some_Streamer', 'a1b2c3d4e5f6g7h8i9j0k1l2m']) assert.ok(isValidChannel(ok), ok);
    for (const bad of ['', 'ab', '#chan', 'has space', 'x'.repeat(26), 'evil\r\nJOIN #other', null]) assert.ok(!isValidChannel(bad), String(bad));
});

test('P5-05 one vote per viewer, last vote wins, ties have no leader', () => {
    const t = new VoteTally(3);
    t.add('a', 0); t.add('b', 1); t.add('a', 1);
    assert.deepStrictEqual(t.counts(), [0, 2, 0]);
    assert.strictEqual(t.total, 2);
    assert.strictEqual(t.leader(), 1);
    t.add('c', 2); t.add('d', 2);
    assert.strictEqual(t.leader(), null, 'two-two tie');
    t.add('', 0); t.add('e', 7);
    assert.strictEqual(t.total, 4, 'no anonymous or out-of-range votes');
    t.reset();
    assert.strictEqual(t.leader(), null);
});

test('P5-05 chat events need enough distinct viewers, scale with chat, and cool down', () => {
    const rules = {window: 30, activeWindow: 120, minVotes: 3, fraction: 0.1, cooldown: 120};
    const g = new EventGate(['blackout', 'lure'], rules);
    g.request('a', 'blackout', 0); g.request('a', 'blackout', 1); g.request('b', 'blackout', 2);
    assert.strictEqual(g.poll(3), null, 'two viewers, one of them twice, is not enough');
    g.request('c', 'blackout', 4);
    assert.strictEqual(g.poll(5, () => false), null, 'the game can veto');
    assert.strictEqual(g.poll(5), 'blackout');
    g.request('a', 'lure', 6); g.request('b', 'lure', 6); g.request('c', 'lure', 6);
    assert.strictEqual(g.poll(7), null, 'cooling down');
    assert.ok(g.cooldownLeft(7) > 0);
    // A busy chat raises the bar: 100 active chatters need 10 requests.
    const busy = new EventGate(['blackout'], rules);
    for (let i = 0; i < 100; i++) busy.seen(`u${i}`, 0);
    for (let i = 0; i < 9; i++) busy.request(`u${i}`, 'blackout', 1);
    assert.strictEqual(busy.progress('blackout', 1).need, 10);
    assert.strictEqual(busy.poll(1), null);
    busy.request('u9', 'blackout', 2);
    assert.strictEqual(busy.poll(2), 'blackout');
    // Requests expire after the window.
    const slow = new EventGate(['lure'], rules);
    slow.request('a', 'lure', 0); slow.request('b', 'lure', 0); slow.request('c', 'lure', 40);
    assert.strictEqual(slow.poll(40), null);
});
