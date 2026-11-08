import TwitchChat from '../system/TwitchChat.js';
import {parseCommand, VoteTally, EventGate, isValidChannel} from '../system/ChatCommands.js';
import {runSeed} from '../system/SeedLink.js';

// Streamer mode (P5-05, D-011): an on-screen seed and chat panel for OBS capture, chat voting on the
// Inquest, and two chat-triggered events. Chat is read-only and anonymous, its text never reaches the
// page, and viewer names are never shown.

const STORAGE_KEY = 'level0_streamer';
const TICK_MS = 250;
const BLACKOUT_MS = 2400;

export default class StreamerMode {
    constructor({env, player, acoustics, inquest}) {
        this.env = env;
        this.player = player;
        this.acoustics = acoustics;
        this.inquest = inquest;
        this.chat = new TwitchChat();
        this.votes = new VoteTally(3);
        this.gate = new EventGate(['blackout', 'lure']);
        this.enabled = false;
        this._inquestOpen = false;
        this._flash = null;
        this._flashUntil = 0;
        this.chat.onMessage = (m) => this._onChat(m);
        this.chat.onStatus = () => this._render();
    }

    bind() {
        this._panel = document.createElement('div');
        this._panel.id = 'streamer-panel';
        this._panel.className = 'osd-element';
        this._panel.style.cssText = 'left: clamp(1.2rem, 4vmin, 3rem); bottom: clamp(4rem, 6vmin, 5.5rem); ' +
            'text-align: left; line-height: 1.35; z-index: 100; pointer-events: none; display: none; ' +
            'white-space: pre; font-size: clamp(0.95rem, 2vmin, 1.2rem);';
        const parent = document.getElementById('screen-wrapper') || document.body;
        parent.appendChild(this._panel);
        this._cut = document.createElement('div');
        this._cut.id = 'chat-cut';
        this._cut.style.cssText = 'position: absolute; inset: 0; background: #000; opacity: 0; z-index: 5; pointer-events: none;';
        parent.appendChild(this._cut);
        this._inquestLine = document.getElementById('inquest-chat');

        this._toggle = document.getElementById('streamerToggle');
        this._channelInput = document.getElementById('streamerChannel');
        this._connectBtn = document.getElementById('streamerConnectBtn');
        this._statusEl = document.getElementById('streamerStatus');

        const saved = this._load();
        if (this._channelInput) this._channelInput.value = saved.channel || '';
        if (this._toggle) {
            this._toggle.checked = !!saved.enabled;
            this._toggle.addEventListener('change', () => this.setEnabled(this._toggle.checked));
        }
        if (this._connectBtn) this._connectBtn.addEventListener('click', () => this._connectFromInput());
        if (this._channelInput) {
            this._channelInput.addEventListener('keydown', (e) => {
                // Typing in the field must not walk the player or open menus.
                e.stopPropagation();
                if (e.key === 'Enter') this._connectFromInput();
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'Digit4' || !this._inquestOpen) return;
            const leader = this.votes.leader();
            if (leader !== null) this.inquest.handleInquest(leader);
        });
        this.setEnabled(!!saved.enabled);
        setInterval(() => this._tick(), TICK_MS);
    }

    setEnabled(on) {
        this.enabled = on;
        if (this._toggle) this._toggle.checked = on;
        if (this._panel) this._panel.style.display = on ? 'block' : 'none';
        const channel = this._channelInput ? this._channelInput.value.trim() : '';
        if (on && isValidChannel(channel)) this.chat.connect(channel);
        if (!on) this.chat.disconnect();
        this._save();
        this._render();
    }

    _connectFromInput() {
        const channel = this._channelInput ? this._channelInput.value.trim().replace(/^#/, '') : '';
        if (this._channelInput) this._channelInput.value = channel;
        if (!this.enabled) this.setEnabled(true);
        else this.chat.connect(channel);
        this._save();
        this._render();
    }

    _load() {
        try {
            const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return {enabled: v.enabled === true, channel: isValidChannel(v.channel) ? v.channel : ''};
        } catch (e) {
            return {enabled: false, channel: ''};
        }
    }

    _save() {
        try {
            const channel = this._channelInput ? this._channelInput.value.trim() : '';
            localStorage.setItem(STORAGE_KEY, JSON.stringify({enabled: this.enabled, channel: isValidChannel(channel) ? channel : ''}));
        } catch (e) { /* storage refused: settings last for this page only */ }
    }

    _onChat({userId, text}) {
        const now = performance.now() / 1000;
        this.gate.seen(userId, now);
        const cmd = parseCommand(text, 3);
        if (!cmd) return;
        if (cmd.type === 'vote') {
            // Votes only count while the Inquest is open, so a finding is chosen for the case in front of chat.
            if (this._inquestOpen) this.votes.add(userId, cmd.option);
        } else if (cmd.type === 'event') {
            this.gate.request(userId, cmd.name, now);
        }
    }

    _tick() {
        const overlay = document.getElementById('inquest-overlay');
        const open = !!overlay && overlay.style.display === 'block';
        if (open && !this._inquestOpen) this.votes.reset(3);
        this._inquestOpen = open;
        if (this.enabled && this.chat.status === 'live') {
            const fired = this.gate.poll(performance.now() / 1000, (name) => this._allowed(name));
            if (fired) this._fire(fired);
        }
        this._render();
    }

    // The game can veto a chat event. Never during the scripted opening (it would spoil the sighting),
    // a document, the Inquest, death or a load; and a lure only when the Anomaly is out hunting.
    _allowed(name) {
        const env = this.env;
        if (env.opening && env.opening.active) return false;
        if (this.player.isDead || env.isSpawning || this.player.input.state.isReading) return false;
        if (name === 'lure') {
            const em = env.entityManager;
            const anomaly = em && em.entities ? em.entities.DEFAULT : null;
            return !!anomaly && em.activeEntity === anomaly && anomaly.isActive && anomaly.graceTimer <= 0;
        }
        return true;
    }

    _fire(name) {
        if (name === 'blackout') {
            this.acoustics.triggerSomaticEvent('breaker', 1.0, 0.9);
            this.acoustics.triggerSomaticEvent('light_flicker', 2.0, 0.8);
            const cut = this._cut;
            cut.style.transition = 'none';
            cut.style.opacity = '1';
            setTimeout(() => { cut.style.opacity = '0.2'; }, 90);
            setTimeout(() => { cut.style.opacity = '1'; }, 180);
            setTimeout(() => {
                cut.style.transition = 'opacity 0.6s ease-in';
                cut.style.opacity = '0';
            }, BLACKOUT_MS);
            this._flashText('CHAT CUT THE LIGHTS');
        } else if (name === 'lure') {
            const anomaly = this.env.entityManager.entities.DEFAULT;
            // _noteContact is how the Anomaly hears a noise: a last-known position near the player,
            // scattered so it has to search rather than walk straight in.
            anomaly._noteContact(this.env.camera.position, 16.0);
            this.acoustics.triggerSomaticEvent('whisper', 9.0, 0.6);
            this._flashText('CHAT CALLED SOMETHING TO YOU');
        }
    }

    _flashText(text) {
        this._flash = text;
        this._flashUntil = performance.now() + 4000;
    }

    _statusText() {
        const s = this.chat.status;
        const ch = this.chat.channel ? `#${this.chat.channel}` : '';
        if (s === 'live') return `CHAT ${ch} LIVE`;
        if (s === 'connecting') return `CHAT ${ch} CONNECTING`;
        if (s === 'retrying') return `CHAT ${ch} RECONNECTING`;
        if (s === 'error') return 'CHAT: ENTER A TWITCH CHANNEL NAME';
        return 'CHAT OFF';
    }

    _render() {
        if (this._statusEl) this._statusEl.textContent = this._statusText();
        if (this._inquestLine) {
            const showVotes = this.enabled && this.chat.status === 'live' && this._inquestOpen;
            if (showVotes) {
                const c = this.votes.counts();
                const leader = this.votes.leader();
                this._inquestLine.textContent =
                    `CHAT VERDICT  [1] ${c[0]}  [2] ${c[1]}  [3] ${c[2]}` +
                    (leader !== null ? `  —  PRESS 4 TO FILE CHAT'S FINDING [${leader + 1}]` : '  —  CHAT: TYPE !1 !2 OR !3');
                this._inquestLine.style.display = 'block';
            } else {
                this._inquestLine.style.display = 'none';
            }
        }
        if (!this.enabled || !this._panel) return;
        const seedInput = document.getElementById('seedInput');
        const lines = [`SEED ${runSeed(seedInput ? seedInput.value : '')}`, this._statusText()];
        if (this.chat.status === 'live') {
            const now = performance.now() / 1000;
            const wait = Math.ceil(this.gate.cooldownLeft(now));
            if (wait > 0) {
                lines.push(`CHAT EVENTS IN ${wait}s`);
            } else {
                const b = this.gate.progress('blackout', now);
                const l = this.gate.progress('lure', now);
                lines.push(`!BLACKOUT ${b.have}/${b.need}  !LURE ${l.have}/${l.need}`);
            }
        }
        if (this._flash && performance.now() < this._flashUntil) lines.push(`> ${this._flash}`);
        // textContent: the seed can come from a shared link (untrusted), and nothing here is markup.
        this._panel.textContent = lines.join('\n');
    }
}
