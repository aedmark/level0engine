import {parseIrcLine, isValidChannel, MAX_LINE} from './ChatCommands.js';

// Read-only Twitch chat over Twitch's IRC WebSocket with an anonymous "justinfan" login (D-011).
// No account, token or Twitch app is involved, so nothing secret is stored and nothing can be posted.
// Twitch documents only the authenticated form of this endpoint; the anonymous login is long-standing
// but undocumented, so this class is the one place to swap for EventSub if Twitch ever closes it.

const URL = 'wss://irc-ws.chat.twitch.tv:443';
const MAX_BACKOFF_MS = 30000;

export default class TwitchChat {
    constructor() {
        this.channel = null;
        this.status = 'off'; // off | connecting | live | retrying | error
        this.onMessage = null; // ({userId, text}) => void
        this.onStatus = null;  // (status) => void
        this._ws = null;
        this._retryMs = 2000;
        this._retryTimer = null;
        this._wanted = false;
    }

    connect(channel) {
        if (!isValidChannel(channel)) {
            this._setStatus('error');
            return false;
        }
        this.disconnect();
        this.channel = channel.toLowerCase();
        this._wanted = true;
        this._retryMs = 2000;
        this._open();
        return true;
    }

    disconnect() {
        this._wanted = false;
        clearTimeout(this._retryTimer);
        if (this._ws) {
            this._ws.onclose = null;
            try { this._ws.close(); } catch (e) { /* already closed */ }
            this._ws = null;
        }
        this._setStatus('off');
    }

    _setStatus(s) {
        if (this.status === s) return;
        this.status = s;
        if (this.onStatus) this.onStatus(s);
    }

    _open() {
        this._setStatus('connecting');
        let ws;
        try {
            ws = new WebSocket(URL);
        } catch (e) {
            this._scheduleRetry();
            return;
        }
        this._ws = ws;
        ws.onopen = () => {
            ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            ws.send('PASS SCHMOOPIIE');
            ws.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`);
            ws.send(`JOIN #${this.channel}`);
        };
        ws.onmessage = (e) => {
            const data = typeof e.data === 'string' ? e.data : '';
            for (const line of data.split('\r\n')) {
                if (line.length > MAX_LINE) continue;
                this._handle(parseIrcLine(line));
            }
        };
        ws.onerror = () => { /* onclose follows and decides */ };
        ws.onclose = () => {
            this._ws = null;
            if (this._wanted) this._scheduleRetry();
        };
    }

    _handle(msg) {
        if (!msg) return;
        switch (msg.command) {
            case 'PING':
                if (this._ws) this._ws.send(`PONG :${msg.text || 'tmi.twitch.tv'}`);
                break;
            case 'JOIN':
            case 'ROOMSTATE':
                this._retryMs = 2000;
                this._setStatus('live');
                break;
            case 'RECONNECT':
                // Twitch asks clients to reconnect before server maintenance.
                if (this._ws) this._ws.close();
                break;
            case 'PRIVMSG': {
                if (!this.onMessage || msg.text === null) return;
                // user-id is stable across renames; the nick from the prefix is a fallback only.
                const userId = msg.tags['user-id'] || (msg.prefix ? msg.prefix.split('!')[0] : null);
                if (userId) this.onMessage({userId, text: msg.text});
                break;
            }
            default:
                break;
        }
    }

    _scheduleRetry() {
        this._setStatus('retrying');
        clearTimeout(this._retryTimer);
        this._retryTimer = setTimeout(() => { if (this._wanted) this._open(); }, this._retryMs);
        this._retryMs = Math.min(MAX_BACKOFF_MS, this._retryMs * 2);
    }
}
