// Aether Investigations - synthesized ambient background music (no file needed)
// Creates a slow, moody detective-style pad loop using Web Audio API.

const AetherBGM = (() => {
    let ctx;
    let masterGain;
    let nodes = [];
    let running = false;

    // Notes for a slow, minor, mysterious pad (in Hz) - low register
    const chordNotes = [
        [110.00, 130.81, 164.81],   // A2, C3, E3
        [98.00, 123.47, 146.83],    // G2, B2, D3
        [110.00, 130.81, 164.81],   // A2, C3, E3
        [87.31, 110.00, 130.81],    // F2, A2, C3
    ];
    let chordIndex = 0;
    let chordTimer = null;

    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    function playChord(freqs) {
        const audioCtx = getCtx();
        const now = audioCtx.currentTime;
        const chordGain = audioCtx.createGain();
        chordGain.gain.value = 0;
        chordGain.connect(masterGain);

        freqs.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;

            const lfo = audioCtx.createOscillator();
            lfo.frequency.value = 0.1 + Math.random() * 0.1;
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 2;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(now);

            osc.connect(chordGain);
            osc.start(now);

            nodes.push(osc, lfo);
        });

        // slow fade in / hold / fade out over 8 seconds
        chordGain.gain.linearRampToValueAtTime(0.05, now + 2);
        chordGain.gain.linearRampToValueAtTime(0.05, now + 6);
        chordGain.gain.linearRampToValueAtTime(0, now + 8);

        nodes.push(chordGain);
    }

    function loop() {
        if (!running) return;
        playChord(chordNotes[chordIndex]);
        chordIndex = (chordIndex + 1) % chordNotes.length;
        chordTimer = setTimeout(loop, 6000);
    }

    function start() {
        if (running) return;
        const audioCtx = getCtx();
        if (!masterGain) {
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 1;
            masterGain.connect(audioCtx.destination);
        }
        running = true;
        loop();
    }

    function stop() {
        running = false;
        if (chordTimer) clearTimeout(chordTimer);
        nodes.forEach(n => {
            try { n.stop && n.stop(); } catch (e) {}
            try { n.disconnect(); } catch (e) {}
        });
        nodes = [];
    }

    function setMuted(muted) {
        if (!masterGain) return;
        masterGain.gain.value = muted ? 0 : 1;
    }

    return { start, stop, setMuted };
})();

// --- Mute button + persistence across page loads ---
document.addEventListener("DOMContentLoaded", () => {
    const isMuted = sessionStorage.getItem("aether_bgm_muted") === "true";

    const btn = document.createElement("button");
    btn.id = "bgm-toggle";
    btn.textContent = isMuted ? "🔇 Music Off" : "🔊 Music On";
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

    // Browsers block audio until a user gesture; start on first click anywhere if not muted.
    let started = false;
    function tryStart() {
        if (started) return;
        started = true;
        AetherBGM.start();
        AetherBGM.setMuted(isMuted);
        document.removeEventListener("click", tryStart);
    }
    document.addEventListener("click", tryStart);

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentlyMuted = sessionStorage.getItem("aether_bgm_muted") === "true";
        const newMuted = !currentlyMuted;
        sessionStorage.setItem("aether_bgm_muted", newMuted);
        AetherBGM.setMuted(newMuted);
        btn.textContent = newMuted ? "🔇 Music Off" : "🔊 Music On";
        if (!started) tryStart();
    });
});