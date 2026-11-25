import { CUE_SECONDS, X, Y, Z } from './score.mjs';

const TAU = Math.PI * 2;

function noiseGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2147483648 - 1;
  };
}

export function makeBuffer(context, stem) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.round(CUE_SECONDS * rate), rate);
  const data = buffer.getChannelData(0);
  const noise = noiseGenerator(3401 + stem);
  let smooth = 0, previous = 0, phase = 0;
  const drops = [0.21,0.58,0.89,1.34,1.51,1.93,2.18,2.82,3.05,3.41,3.70];
  const bells = [0.24,1.68,2.92];
  let dropIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    const fade = Math.min(1, t / 0.035, (CUE_SECONDS - t) / 0.09);
    const white = noise();
    smooth += (1 - Math.exp(-TAU * 520 / rate)) * (white - smooth);
    let value;
    if (stem === 0) {
      if (dropIndex + 1 < drops.length && t >= drops[dropIndex + 1]) dropIndex++;
      const d = dropIndex < 0 ? 4 : t - drops[dropIndex];
      const ping = Math.sin(TAU * (790 + 67 * (dropIndex % 4)) * d)
        * Math.exp(-d * 42) * Math.min(1, d * 950);
      value = (white - previous) * 0.065 + smooth * 0.32 + ping * 0.30;
    } else if (stem === 1) {
      value = 0;
      for (const onset of bells) {
        const d = t - onset;
        if (d >= 0) {
          value += Math.min(1, d / 0.006) * (
            0.29 * Math.exp(-d * 2.3) * Math.sin(TAU * 612 * d) +
            0.13 * Math.exp(-d * 5) * Math.sin(TAU * 1481 * d) +
            0.055 * Math.exp(-d * 8) * Math.sin(TAU * 2273 * d));
        }
      }
    } else {
      const speed = t / CUE_SECONDS;
      phase += TAU * (78 + 16 * speed) / rate;
      const wheels = 0.5 + 0.5 * Math.cos(TAU * (2.1*t + 0.21*t*t));
      value = (Math.sin(phase) * 0.21 + Math.sin(phase*2) * 0.09 +
        Math.sin(phase*3) * 0.04) * (0.64 + wheels * 0.36) + smooth*wheels*0.21;
    }
    previous = white;
    data[i] = value * fade;
  }
  return buffer;
}

export function poseListener(context, position, forward, up) {
  const listener = context.listener;
  if (listener.positionX) {
    for (const [prefix, vec] of [['position',position],['forward',forward],['up',up]]) {
      for (const axis of ['x','y','z']) listener[prefix + axis.toUpperCase()].value = vec[axis];
    }
  } else {
    listener.setPosition(position.x,position.y,position.z);
    listener.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);
  }
}

export function schedule(context, buffers, plan, start, muted = false) {
  const bus = context.createGain();
  bus.gain.value = muted ? 0 : 0.72;
  bus.connect(context.destination);
  const voices = plan.events.map(event => {
    const source = context.createBufferSource();
    source.buffer = buffers[event.stem];
    const gain = context.createGain();
    gain.gain.value = event.level;
    const pan = context.createPanner();
    pan.panningModel = 'equalpower';
    pan.distanceModel = 'inverse';
    pan.refDistance = 5;
    pan.rolloffFactor = 0.65;
    pan.setPosition(X[event.side], Y[event.stem], Z[event.stem]);
    source.connect(gain); gain.connect(pan); pan.connect(bus);
    source.start(start + event.offset);
    return { source, gain, pan };
  });
  return {
    mute(muted) { bus.gain.setTargetAtTime(muted ? 0 : 0.72, context.currentTime, 0.012); },
    stop() {
      for (const {source,gain,pan} of voices) {
        try { source.stop(); } catch (error) { if (error.name !== 'InvalidStateError') throw error; }
        source.disconnect(); gain.disconnect(); pan.disconnect();
      }
      bus.disconnect();
    }
  };
}
