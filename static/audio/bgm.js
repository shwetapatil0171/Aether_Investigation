const AetherBGM = (() => {
    let ctx;
    let masterGain;
    let running = false;
    let stepTimer = null;
    let stepIndex = 0;

    // Walking bass line (noir minor feel) - one note per beat, 8 beats
    const bassNotes = [55.00, 58.27, 61.74, 55.00, 49.00, 51.91, 55.00, 61.74];

    // Sparse mysterious piano notes - plays occasionally, not every beat
    const pianoPattern = [
        null, 220.00, null, null, 261.63, null, 196.00, null
    ];

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    function pluck(freq, time, gainNode, duration = 0.4, type = "triangle") {
        const audioCtx = getCtx();
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(gainNode);
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(0.25, time + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.start(time);
        osc.stop(time + duration);
    }

    function hihat(time, gainNode) {
        const audioCtx = getCtx();
        const bufferSize = audioCtx.sampleRate * 0.05;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 6000;
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.06, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        noise.connect(filter);
        filter.connect(g);
        g.connect(gainNode);
        noise.start(time);
    }

    function step() {
        if (!running) return;
        const audioCtx = getCtx();
        const now = audioCtx.currentTime;
        const beatLen = 0.7; // seconds per beat - slow, noir tempo

        pluck(bassNotes[stepIndex], now, masterGain, beatLen * 0.95, "triangle");

        const pianoNote = pianoPattern[stepIndex];
        if (pianoNote) {
            pluck(pianoNote, now + 0.05, masterGain, 1.2, "sine");
        }

        // soft swung hi-hat on off-beats
        hihat(now + beatLen * 0.5, masterGain);

        stepIndex = (stepIndex + 1) % bassNotes.length;
        stepTimer = setTimeout(step, beatLen * 1000);
    }

    function start() {
        const audioCtx = getCtx();
        if (audioCtx.state === "suspended") audioCtx.resume();
        if (running) return;
        if (!masterGain) {
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 1;
            masterGain.connect(audioCtx.destination);
        }
        running = true;
        step();
    }

    function setMuted(muted) {
        if (!masterGain) return;
        masterGain.gain.value = muted ? 0 : 1;
    }

    return { start, setMuted };
})();

document.addEventListener("DOMContentLoaded", () => {
    let musicOn = false;

    const btn = document.createElement("button");
    btn.id = "bgm-toggle";
    btn.textContent = "🔇 Music Off";
    btn.style.position = "fixed";
    btn.style.bottom = "16px";
    btn.style.right = "16px";
    btn.style.zIndex = "9999";
    btn.style.padding = "8px 14px";
    btn.style.borderRadius = "20px";
    btn.style.border = "none";
    btn.style.background = "#1e293b";
    btn.style.color = "white";
    btn.style.fontSize = "13px";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 0 10px rgba(0,0,0,0.4)";
    document.body.appendChild(btn);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        musicOn = !musicOn;
        if (musicOn) {
            AetherBGM.start();
            AetherBGM.setMuted(false);
            btn.textContent = "🔊 Music On";
        } else {
            AetherBGM.setMuted(true);
            btn.textContent = "🔇 Music Off";
        }
    });
});
