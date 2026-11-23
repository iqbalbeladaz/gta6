// Procedural sound built on WebAudio — there are no audio files at all.
// Everything is synthesized live: an engine hum that follows the car's speed,
// a two-tone siren, gunshots and punches from filtered noise, pickup and cash
// chimes, and short mission stingers. The context starts on the first user
// gesture, as browsers require.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenFlip = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return false;
    }
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(ctx.destination);
    engineOsc.start();
    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    sirenOsc.type = 'square';
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(ctx.destination);
    sirenOsc.start();
    return true;
  }

  function blip(freq, seconds, type, volume, slideTo) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  function noise(seconds, volume) {
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.buffer = buffer;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  return {
    unlock: ensure,
    engine(speedRatio, driving) {
      if (!ctx) return;
      const target = driving ? 0.028 + Math.abs(speedRatio) * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(52 + Math.abs(speedRatio) * 148, ctx.currentTime, 0.08);
    },
    siren(active, dt) {
      if (!ctx) return;
      sirenFlip += dt;
      const freq = Math.floor(sirenFlip * 1.6) % 2 === 0 ? 660 : 880;
      sirenOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.03);
      sirenGain.gain.setTargetAtTime(active ? 0.012 : 0, ctx.currentTime, 0.1);
    },
    shoot() { noise(0.09, 0.22); blip(190, 0.08, 'square', 0.1, 60); },
    punch() { noise(0.05, 0.12); },
    crash(strength) { noise(0.16, Math.min(0.3, 0.08 + strength * 0.2)); blip(90, 0.14, 'triangle', 0.14, 40); },
    pickup() { blip(880, 0.09, 'sine', 0.12); setTimeout(() => blip(1320, 0.12, 'sine', 0.12), 70); },
    cash() { blip(1180, 0.07, 'triangle', 0.12); setTimeout(() => blip(1560, 0.1, 'triangle', 0.12), 60); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.11), i * 95)); },
    fail() { [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.11), i * 110)); },
    door() { blip(240, 0.06, 'square', 0.07, 160); },
    heal() { blip(660, 0.12, 'sine', 0.1, 990); },
  };
}
