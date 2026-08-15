export default class InquestController {
    constructor(player, acoustics, engine, environment, getStoryFn, onAscension, onBlackout) {
        this.player = player;
        this.acoustics = acoustics;
        this.engine = engine;
        this.environment = environment;
        this.getStory = getStoryFn;
        this.onAscension = onAscension;
        this.onBlackout = onBlackout;
        this.pendingExit = null;
        this.inquestLocked = false;
    }

    handleInquest(choice) {
        if (this.inquestLocked || !this.pendingExit) return;
        this.inquestLocked = true;
        const story = this.getStory();
        const result = document.getElementById('inquest-result');
        if (choice === story.truth) {
            result.innerText = '> FINDING ACCEPTED. CASE CLOSED.';
            result.style.color = '#55ff55';
            this.player.coherence = 1.0;
            const exitRef = this.pendingExit;
            this.pendingExit = null;
            this.acoustics.triggerSomaticEvent('tape_click', 1.0, 0.6);
            setTimeout(() => {
                document.getElementById('inquest-overlay').style.display = 'none';
                document.getElementById('virtual-cursor').classList.remove('active');
                this.player.input.state.isReading = false;
                exitRef.userData.active = false;
                this.player.objectives.escaped = true;
                this.player.objectiveUI.innerHTML = '> CASE CLOSED.<br>> DESCENDING TO DEEPER LAYER...';
                this.player.objectiveUI.style.color = '#aa55ff';
                document.dispatchEvent(new CustomEvent('somatic-door', {detail: {distSq: 0.1, intensity: 3.0}}));
                if (this.engine.ambientLight) this.engine.ambientLight.intensity = 5.0;
                const flash = document.getElementById('flash-overlay');
                if (flash) {
                    flash.style.transition = 'opacity 3.0s ease-in';
                    flash.style.backgroundColor = '#000';
                    flash.style.opacity = '1';
                    setTimeout(() => {
                        this.player.objectives.fixed = 0;
                        this.player.objectives.escaped = false;
                        this.player.hasVisitedAnnex = false;
                        this.player.inventory.hasExitKey = false;
                        this.player.depth++;
                        if (this.player.depth > this.player.bestDepth) this.player.bestDepth = this.player.depth;
                        this.player.updateObjectives();
                        this.onAscension();
                        this.environment.generate();
                    }, 3500);
                }
            }, 1600);
        } else {
            result.innerText = '> FINDING REJECTED. THE FACILITY DISAGREES.';
            result.style.color = '#ff5555';
            this.pendingExit = null;
            this.acoustics.triggerSomaticEvent('breaker', 1.0, 0.8);
            setTimeout(() => {
                document.getElementById('inquest-overlay').style.display = 'none';
                document.getElementById('virtual-cursor').classList.remove('active');
                this.player.input.state.isReading = false;
                this.onBlackout();
                this.player.resetMetabolism();
                this.environment.generate();
            }, 2000);
        }
    }

    bindEvents() {
        document.addEventListener('somatic-inquest', (e) => {
            if (this.player.input.state.isReading) return;
            this.player.input.state.isReading = true;
            this.player.input.state.isRunning = false;
            
            this.player.input.cursorX = window.innerWidth / 2;
            this.player.input.cursorY = window.innerHeight / 2;
            document.getElementById('virtual-cursor').classList.add('active');
            
            this.pendingExit = e.detail.exitRef;
            this.inquestLocked = false;
            const story = this.getStory();
            const v = story.getVerdicts();
            const progress = story.progress();
            document.getElementById('inquest-case').innerText =
                `CASE FILE: PROJECT ${v.project} — DATA RECOVERED [ ${progress.found} / ${progress.total} ]`;
            document.getElementById('inquest-hint').innerText = v.tellCorroborated
                ? `CORROBORATED ACROSS ${v.caseStrength} SECTORS. THE RECORD SUPPORTS ONE FINDING. FILE IT.`
                : `CLAIMS SETTLED: ${v.settled} OF ${v.resolvable}. NO FINDING IS CORROBORATED. FILING NOW IS A GUESS AT ONE IN THREE.`;
            for (let i = 0; i < 3; i++) {
                const btn = document.getElementById(`inquest-opt-${i}`);
                btn.innerText = `[${i + 1}] ${v.options[i]}`;
            }
            const result = document.getElementById('inquest-result');
            result.innerText = '';
            document.getElementById('inquest-overlay').style.display = 'block';
            this.acoustics.triggerSomaticEvent('document_rustle', 1.0, 0.4);
        });
        document.addEventListener('keydown', (e) => {
            const ov = document.getElementById('inquest-overlay');
            if (!ov || ov.style.display !== 'block') return;
            if (e.code === 'Digit1') this.handleInquest(0);
            else if (e.code === 'Digit2') this.handleInquest(1);
            else if (e.code === 'Digit3') this.handleInquest(2);
        });
        window.handleInquest = (choice) => this.handleInquest(choice);
    }
}