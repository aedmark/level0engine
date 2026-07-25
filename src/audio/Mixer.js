// Mixer.js
// LEVEL 0 AUDIO MIXER

import SECTORS from '../world/Sectors.js';

/**
 * Mixer
 * 
 * Modulates the parameters of the Web Audio nodes in real-time based on player telemetry.
 * It blends procedural ambiance, kinetic filters (footsteps, exertion), and somatic 
 * events depending on the active sector and the player's physical/mental state.
 */
export default class Mixer {
    static update(engine, telemetry) {
        if (!engine.initialized || !engine.mainGain || engine.ctx.state === 'suspended') return;
        
        const time = engine.ctx.currentTime;
        if (time < 0.1) return;
        
        const {
            minLightDist,
            isOccluded,
            activeSector,
            anomalyPressure,
            playerSpeed,
            playerExhaustion,
            isBlackout,
            paranoia,
            adrenaline = 0.0,
            eyesClosed = 0.0,
            idlingCarDistSq = 9999.0
        } = telemetry;
        
        const proximity = Math.max(0, 1.0 - (minLightDist / 20.0));
        const mix = (SECTORS[activeSector] && SECTORS[activeSector].ambience) || SECTORS.NORMAL.ambience;
        const structuralTension = Math.max(0.0, ((paranoia || 0.0) - 0.5) * 1.0);
        
        const setParam = (key, param, target, timeConstant) => {
            if (Math.abs((engine._cache.get(key) || -999) - target) > 0.001) {
                param.setTargetAtTime(target, time + 0.02, timeConstant);
                engine._cache.set(key, target);
            }
        };
        
        const voidBreath = isBlackout ? 0.0008 + (Math.sin(time * 0.25) * 0.0004) : 0.0;
        const mainTarget = isBlackout ? voidBreath : 0.003 + (proximity * 0.01);
        setParam('main', engine.mainGain.gain, mainTarget, 0.5);
        
        const baseWhine = isBlackout ? 0.0 : (isOccluded ? mix.whineOcc : mix.whine + (mix.dynamicWhine ? proximity * 0.003 : 0.0));
        setParam('whine', engine.whineGain.gain, baseWhine, 0.5);
        
        if (engine.atriumGain) {
            let noiseTarget = (isBlackout ? mix.noise * 0.1 : mix.noise) + structuralTension;
            if (activeSector === "ATRIUM" && !isBlackout) {
                noiseTarget = mix.noise * (0.35 + 1.3 * Math.abs(Math.sin(time * 0.11) * Math.sin(time * 0.053))) + structuralTension;
            }
            setParam('atrium', engine.atriumGain.gain, noiseTarget, 1.0);
        }
        
        const targetNoiseFreq = activeSector === "MAINTENANCE" ? 110.0 : (activeSector === "INCINERATOR" ? 400.0 : (activeSector === "SERVER" ? 2400.0 : (activeSector === "ATRIUM" ? 150.0 : 300.0)));
        setParam('noiseFreq', engine.noiseFilter.frequency, targetNoiseFreq, 0.4);
        
        if (engine.brownGain) {
            setParam('srvBrown', engine.brownGain.gain, (activeSector === "SERVER" && !isBlackout) ? 0.05 : 0.0, 1.2);
        }
        
        const bellPulse = activeSector === "MAINTENANCE" && !isBlackout ? (Math.max(0, Math.sin(time * 2.5)) ** 6.0) * 0.07 : 0.0;
        if (engine.hazardBellGain) setParam('hazardBell', engine.hazardBellGain.gain, bellPulse, 0.05);
        if (engine.peaceGain) setParam('peace', engine.peaceGain.gain, Math.max(0, mix.peace - structuralTension), 2.0);
        if (engine.entityGain) setParam('entity', engine.entityGain.gain, anomalyPressure > 0.0 ? anomalyPressure * 0.4 : 0.0, 0.2);
        
        if (engine.paranoiaGain) {
            setParam('paranoiaVol', engine.paranoiaGain.gain, structuralTension > 0.0 ? structuralTension * 0.2 : 0.0, 1.0);
            setParam('paranoiaLFO', engine.paranoiaLFO.frequency, Math.max(0.5, 4.0 - (structuralTension * 4.0)), 1.0);
            setParam('paranoiaPitch', engine.paranoiaOsc.frequency, Math.max(300, 650 - (structuralTension * 300.0)), 1.0);
        }
        
        if (engine.spatialDelay) {
            const room = SECTORS[activeSector];
            const targetDelay = (room && room.delay) || 0.15;
            const targetFeedback = (room && room.feedback) || 0.2;
            setParam('delayTime', engine.spatialDelay.delayTime, targetDelay, 1.0);
            setParam('feedback', engine.feedbackGain.gain, targetFeedback, 1.0);
        }
        
        if (engine.idlingGain) {
            const idleVol = Math.max(0.0, 1.0 - Math.sqrt(idlingCarDistSq) / 30.0);
            setParam('idling', engine.idlingGain.gain, idleVol * 0.20, 0.5);
        }
        
        if (engine.chasmGroanGain) {
            if (activeSector === "CHASM" && !isBlackout) {
                if (!engine._nextGroanTime) engine._nextGroanTime = time + 2.0 + Math.random() * 5.0;
                
                if (time > engine._nextGroanTime) {
                    const duration = 2.0 + Math.random() * 4.5; 
                    engine._nextGroanTime = time + duration + 6.0 + Math.random() * 12.0; 
                    
                    const startPitch = 40 + Math.random() * 30; 
                    const endPitch = startPitch * (0.5 + Math.random() * 0.3); 
                    
                    engine.groanOsc1.frequency.setValueAtTime(startPitch, time);
                    engine.groanOsc1.frequency.exponentialRampToValueAtTime(endPitch, time + duration);
                    engine.groanOsc2.frequency.setValueAtTime(startPitch - 1.5, time);
                    engine.groanOsc2.frequency.exponentialRampToValueAtTime(endPitch - 1.5, time + duration);
                    
                    const peakGain = 0.12 + Math.random() * 0.1;
                    engine.chasmGroanGain.gain.setValueAtTime(0.001, time);
                    engine.chasmGroanGain.gain.linearRampToValueAtTime(peakGain, time + duration * 0.3);
                    engine.chasmGroanGain.gain.linearRampToValueAtTime(0.001, time + duration);
                }
            } else {
                setParam('chasmGroan', engine.chasmGroanGain.gain, 0.0, 1.0);
                engine._nextGroanTime = 0;
            }
        }
        
        if (engine.muzakGain) {
            if (activeSector === "ANNEX" && !isBlackout) {
                setParam('muzak', engine.muzakGain.gain, 1.2, 2.0);
                if (!engine._muzakNextBeat || time > engine._muzakNextBeat - 0.5) {
                    if (!engine._muzakNextBeat) engine._muzakNextBeat = time + 0.1;
                    if (engine._muzakStep === undefined) engine._muzakStep = 0;
                    
                    const chords = [
                        [174.61, 220.00, 261.63, 329.63],
                        [185.00, 220.00, 261.63, 311.13],
                        [196.00, 233.08, 293.66, 349.23],
                        [196.00, 246.94, 293.66, 349.23],
                    ];
                    const melody = [
                        349.23, 392.00, 440.00, 523.25, 
                        349.23, null,   440.00, 392.00,
                        349.23, 392.00, 440.00, 523.25,
                        587.33, 523.25, 440.00, 392.00
                    ];
                    
                    const beatTime = engine._muzakNextBeat;
                    const chordIdx = Math.floor(engine._muzakStep / 4) % chords.length;
                    
                    if (engine._muzakStep % 4 === 0) {
                        chords[chordIdx].forEach(f => engine.playMuzakNote(f, beatTime, true));
                    }
                    
                    const mFreq = melody[engine._muzakStep % melody.length];
                    if (mFreq) {
                        engine.playMuzakNote(mFreq, beatTime, false);
                    }
                    
                    engine._muzakNextBeat += 0.5;
                    engine._muzakStep++;
                }
            } else {
                setParam('muzak', engine.muzakGain.gain, 0.0, 2.0);
            }
        }
        
        // --- SECTOR-SPECIFIC AMBIENT EVENTS ---
        // We use a switch statement to cleanly route sector events. 
        // During blackouts, all sector-specific ambient noises cease.
        
        // Always reset timers for inactive sectors to prevent events from carrying over
        if (activeSector !== "ARCHIVE" || isBlackout) { engine._archiveNextEvent = 0; engine._archiveCoughAt = 0; }
        if (activeSector !== "ATRIUM" || isBlackout) { engine._atriumNextEvent = 0; engine._atriumHootAt = 0; }
        if (activeSector !== "IMPOUND" || isBlackout) { engine._impoundNextEvent = 0; }
        if (activeSector !== "BOARDROOM" || isBlackout) { engine._boardroomNextEvent = 0; }
        if (activeSector !== "CHECKPOINT" || isBlackout) { engine._checkpointNextEvent = 0; }

        if (!isBlackout) {
            switch (activeSector) {
                case "ARCHIVE":
                    if (!engine._archiveNextEvent) engine._archiveNextEvent = time + 2.0;
                    if (engine._archiveCoughAt && time >= engine._archiveCoughAt) {
                        engine.triggerSomaticEvent('cough', engine._archiveCoughDistSq, 0.7 + Math.random() * 0.4);
                        engine._archiveCoughAt = 0;
                    }
                    if (time >= engine._archiveNextEvent) {
                        engine._archiveNextEvent = time + 4.0 + Math.random() * 9.0;
                        const roll = Math.random();
                        const fakeDistSq = 36.0 + Math.random() * 364.0;
                        if (roll < 0.45) engine.triggerSomaticEvent('whisper', fakeDistSq, 0.5 + Math.random() * 0.4);
                        else if (roll < 0.75) {
                            engine.triggerSomaticEvent('cough', fakeDistSq, 0.9 + Math.random() * 0.4);
                            engine._archiveCoughAt = time + 0.1 + Math.random() * 0.06;
                            engine._archiveCoughDistSq = fakeDistSq;
                        } else {
                            engine.triggerSomaticEvent('page', fakeDistSq, 0.5 + Math.random() * 0.4);
                        }
                    }
                    break;
                    
                case "ATRIUM":
                    if (!engine._atriumNextEvent) engine._atriumNextEvent = time + 3.0;
                    if (engine._atriumHootAt && time >= engine._atriumHootAt) {
                        engine.triggerSomaticEvent('hoot', engine._atriumHootDistSq, 0.55 + Math.random() * 0.25);
                        engine._atriumHootAt = 0;
                    }
                    if (time >= engine._atriumNextEvent) {
                        engine._atriumNextEvent = time + 5.0 + Math.random() * 10.0;
                        const aRoll = Math.random();
                        const aDistSq = 36.0 + Math.random() * 364.0;
                        if (aRoll < 0.65) {
                            engine.triggerSomaticEvent('leaves', aDistSq, 0.5 + Math.random() * 0.5);
                        } else {
                            engine.triggerSomaticEvent('hoot', aDistSq, 0.7 + Math.random() * 0.3);
                            engine._atriumHootAt = time + 0.4 + Math.random() * 0.15;
                            engine._atriumHootDistSq = aDistSq;
                        }
                    }
                    break;
                    
                case "IMPOUND":
                    if (!engine._impoundNextEvent) engine._impoundNextEvent = time + 3.0;
                    if (time >= engine._impoundNextEvent) {
                        engine._impoundNextEvent = time + 6.0 + Math.random() * 10.0;
                        const iRoll = Math.random();
                        const iDistSq = 36.0 + Math.random() * 364.0;
                        if (iRoll < 0.20) engine.triggerSomaticEvent('car_horn', iDistSq, 0.6 + Math.random() * 0.4);
                        else if (iRoll < 0.65) engine.triggerSomaticEvent('rattle', iDistSq, 0.5 + Math.random() * 0.5);
                        else engine.triggerSomaticEvent('door', iDistSq, 0.25 + Math.random() * 0.15);
                    }
                    break;
                    
                case "BOARDROOM":
                    if (!engine._boardroomNextEvent) engine._boardroomNextEvent = time + 3.0;
                    if (time >= engine._boardroomNextEvent) {
                        engine._boardroomNextEvent = time + 6.0 + Math.random() * 10.0;
                        const bRoll = Math.random();
                        const bDistSq = 36.0 + Math.random() * 364.0;
                        if (bRoll < 0.20) engine.triggerSomaticEvent('phone_ring', bDistSq, 0.4 + Math.random() * 0.3);
                        else if (bRoll < 0.65) engine.triggerSomaticEvent('page', bDistSq, 0.6 + Math.random() * 0.4);
                        else engine.triggerSomaticEvent('tape_click', bDistSq, 0.5 + Math.random() * 0.3);
                    }
                    break;
                    
                case "CHECKPOINT":
                    if (!engine._checkpointNextEvent) engine._checkpointNextEvent = time + 2.0;
                    if (time >= engine._checkpointNextEvent) {
                        engine._checkpointNextEvent = time + 3.0 + Math.random() * 5.0;
                        const cRoll = Math.random();
                        const cDistSq = 36.0 + Math.random() * 200.0;
                        if (cRoll < 0.30) engine.triggerSomaticEvent('terminal_blip', cDistSq, 0.3 + Math.random() * 0.4);
                        else if (cRoll < 0.60) engine.triggerSomaticEvent('tape_garble', cDistSq, 0.4 + Math.random() * 0.4);
                        else engine.triggerSomaticEvent('tape_click', cDistSq, 0.2 + Math.random() * 0.3);
                    }
                    break;
            }
        }
        
        if (engine.tinnitusGain) {
            const isPanicking = paranoia > 0.7 && playerExhaustion > 0.6;
            const tinnitusVolume = (isPanicking ? (paranoia - 0.7) * 0.15 : 0.0) + (adrenaline * 0.4);
            setParam('tinnitus', engine.tinnitusGain.gain, tinnitusVolume, 2.0);
        }
        
        if (engine.subRumble) {
            const heartbeatFreq = playerExhaustion > 0.3 ? 80.0 + (Math.sin(time * (10.0 + playerExhaustion * 5.0 + adrenaline * 10.0)) * 20.0 * playerExhaustion) : 0.0;
            const blackoutLFO = isBlackout ? 25.0 + (Math.sin(time * 0.15) * 10.0) : 0.0;
            const baseRumble = isBlackout ? blackoutLFO : mix.rumble;
            const eyeCloseRumble = eyesClosed > 0.5 ? 40.0 : 0.0;
            setParam('rumble', engine.subRumble.frequency, baseRumble + (anomalyPressure * 40.0) + heartbeatFreq + eyeCloseRumble + (adrenaline * 30.0), 1.0);
        }
        
        if (engine.kineticFilter) {
            const baseFreq = isOccluded ? mix.freqOcc : mix.freq;
            if (engine.exertionLFO) setParam('exertionRate', engine.exertionLFO.frequency, 1.27 + (playerExhaustion * 4.0) + (adrenaline * 5.0), 1.0);
            setParam('exertion', engine.exertionGain.gain, (playerSpeed * 5.0) + (playerExhaustion * 150.0) + (adrenaline * 200.0), 0.2);
            let targetFreq = Math.min(Math.max(40, baseFreq + (playerSpeed * (isOccluded ? 2.0 : 8.0)) - (anomalyPressure * 150.0) - (playerExhaustion * 100.0)), 2000);
            if (eyesClosed > 0.5) {
                targetFreq = 80.0;
            } else if (adrenaline > 0.0) {
                targetFreq = Math.min(2500, targetFreq + (adrenaline * 1000.0));
            }
            const timeConstant = (eyesClosed > 0.5 || adrenaline > 0.0 || isOccluded || activeSector === "ATRIUM" || anomalyPressure > 0.0 || playerExhaustion > 0.0) ? 0.2 : 3.0;
            setParam('kinetic', engine.kineticFilter.frequency, targetFreq, timeConstant);
            
            engine.currentSector = activeSector;
        }
    }
}
