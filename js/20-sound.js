/* ============================================================
   20-sound.js  -  The Memento sound engine (v622).
   Every sound is synthesized live via Web Audio, zero files.
   The set Malik locked on the soundboard (2026-07-07):
     arrival    - the Memento full view pulling up
     evolution  - the clarity unlock cinema, color flooding the card
     firstlight - the beams blooming on
     day1       - the first-ever completed action
     done       - marking the move done
     newday     - the morning breath on the Today panel
     tick       - the typewriter (B5: a felt sub bump, throttled)
   OFF by default: state.prefs.soundOn gates everything. iOS audio
   unlocks on the first user gesture after the toggle is on.
   ============================================================ */

const MementoSound = (() => {
  let ctx = null;
  let master = null;
  let lastTick = 0;

  const on = () => {
    try { return !!(state && state.prefs && state.prefs.soundOn); } catch (e) { return false; }
  };

  const ac = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  };

  // one-time unlock on the first gesture (iOS requires it)
  const unlock = () => { if (on()) ac(); };
  try {
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('click', unlock, { once: true, passive: true });
  } catch (e) {}

  const env = (c, t0, a, h, r, peak) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.setValueAtTime(peak, t0 + a + h);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + h + r);
    return g;
  };
  const verb = (c, secs, decay) => {
    const rate = c.sampleRate, len = Math.floor(rate * secs);
    const b = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    const cv = c.createConvolver(); cv.buffer = b; return cv;
  };

  const S = {
    arrival(c, out) {
      const t = c.currentTime;
      const rv = verb(c, 2.6, 2.4); const rvG = c.createGain(); rvG.gain.value = 0.55;
      rv.connect(rvG).connect(out);
      [55, 110, 164.8, 220, 277.2].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.003);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(220, t);
        lp.frequency.exponentialRampToValueAtTime(1500, t + 1.8);
        const g = env(c, t, 1.4, 0.6, 1.1, [0.4, 0.24, 0.1, 0.07, 0.04][i]);
        o.connect(lp).connect(g); g.connect(out); g.connect(rv);
        o.start(t); o.stop(t + 3.2);
      });
    },
    evolution(c, out) {
      const t = c.currentTime;
      const rv = verb(c, 2.4, 2.2); const rvG = c.createGain(); rvG.gain.value = 0.6;
      rv.connect(rvG).connect(out);
      [523.3, 659.3, 784, 987.8, 1174.7].forEach((f, i) => {
        const t0 = t + 0.28 * i;
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = env(c, t0, 0.25, 0.15, 1.2, 0.09);
        o.connect(g); g.connect(rv); g.connect(out);
        o.start(t0); o.stop(t0 + 1.8);
      });
      const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 65.4;
      const gs = env(c, t, 1.1, 0.6, 1.2, 0.3);
      sub.connect(gs).connect(out); sub.start(t); sub.stop(t + 3);
    },
    firstlight(c, out) {
      const t = c.currentTime;
      const rv = verb(c, 2.2, 2.3); const rvG = c.createGain(); rvG.gain.value = 0.6;
      rv.connect(rvG).connect(out);
      [392, 493.9, 587.3].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.exponentialRampToValueAtTime(2600, t + 1.8);
        const g = env(c, t, 1.3, 0.4, 1.1, 0.1 - i * 0.02);
        o.connect(lp).connect(g); g.connect(out); g.connect(rv);
        o.start(t); o.stop(t + 3.0);
      });
      [784, 987.8, 1174.7].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = env(c, t + 0.6 + i * 0.35, 0.9, 0.4, 1.0, 0.05);
        o.connect(g); g.connect(rv); g.connect(out);
        o.start(t + 0.6 + i * 0.35); o.stop(t + 0.6 + i * 0.35 + 2.2);
      });
    },
    day1(c, out) {
      const t = c.currentTime;
      const rv = verb(c, 2.4, 2.4); const rvG = c.createGain(); rvG.gain.value = 0.55;
      rv.connect(rvG).connect(out);
      const strike = (f, t0, peak) => {
        [1, 2, 3, 4.2].forEach((h, i) => {
          const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * h;
          const g = env(c, t0, 0.02, 0.05, 2.4 - i * 0.4, peak * [1, 0.4, 0.15, 0.05][i]);
          o.connect(g); g.connect(out); g.connect(rv);
          o.start(t0); o.stop(t0 + 3);
        });
      };
      strike(110, t, 0.5);
      strike(164.8, t + 0.22, 0.3);
    },
    done(c, out) {
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1318.5;
      const g = env(c, t, 0.004, 0.02, 0.34, 0.32);
      const g2 = env(c, t + 0.03, 0.004, 0.02, 0.3, 0.18);
      o.connect(g).connect(out); o2.connect(g2).connect(out);
      o.start(t); o2.start(t + 0.03); o.stop(t + 0.5); o2.stop(t + 0.5);
    },
    newday(c, out) {
      const t = c.currentTime;
      [110, 165].forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = env(c, t, 1.3, 0.6, 1.3, [0.3, 0.12][i]);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + 3.2);
      });
    },
    tick(c, out) {
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(240 + Math.random() * 40, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
      const g = env(c, t, 0.002, 0.008, 0.09, 0.22);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.14);
    }
  };

  return {
    play(name) {
      try {
        if (!on() || !S[name]) return;
        const c = ac(); if (!c || !master) return;
        S[name](c, master);
      } catch (e) {}
    },
    // the typewriter tick, self-throttled to a typing rhythm
    tick() {
      try {
        if (!on()) return;
        const now = performance.now();
        if (now - lastTick < 75 + Math.random() * 50) return;
        lastTick = now;
        this.play('tick');
      } catch (e) {}
    }
  };
})();
