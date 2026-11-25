// Positions are metres in the front panel's XY plane. Angles turn around +Z.
export const PARTS = [
  { id: 'mirror', title: '반사경', mark: 'A', shape: '육각', home: [-1.42, 2.02], socket: [-0.38, 1.40], angle: 0, key: 30, color: 0xe9b451 },
  { id: 'filter', title: '필터', mark: 'B', shape: '원형', home: [-1.42, 1.40], socket: [0.34, 1.40], angle: 30, key: 90, color: 0x57d7c4 },
  { id: 'sensor', title: '센서', mark: 'C', shape: '사각', home: [-1.42, 0.78], socket: [1.06, 1.40], angle: 0, key: 330, color: 0xf07756 }
];
export const RADIUS = 0.155;
export const ANGLE_LIMIT = 8;
export const SCAN_TIME = 2.4;
export const WORK_Z = 0.65;
export const BINS = 36;
export const wavelength = i => 420 + 5 * i;
export const wrap = a => ((a % 360) + 360) % 360;
export const angularError = (a, b) => Math.abs(wrap(a - b + 180) - 180);

// Synthetic reference source. It is deliberately independent of the wall clock.
export function sample(gain) {
  const dark = Array.from({length: BINS}, (_, i) => 11 + (i % 5) + 2 * gain);
  const lines = [[8, 24, 1.3], [18, 78, 1.8], [30, 42, 1.25]];
  const raw = dark.map((bias, i) => {
    const light = lines.reduce((n, [center, height, width]) =>
      n + height * Math.exp(-0.5 * ((i - center) / width) ** 2), 3);
    return Math.min(255, Math.round(light * gain + bias));
  });
  return { dark, raw };
}

export function createBench() {
  let state;
  function reset() {
    state = {
      parts: Object.fromEntries(PARTS.map(p => [p.id, { angle: p.angle, mounted: false }])),
      selected: null, gain: 1, dark: null, status: 'assembly', elapsed: 0,
      bars: Array(BINS).fill(0), peak: null, saturated: 0,
      note: '선반의 부품을 고른 뒤 키 각도를 맞추세요.'
    };
  }
  reset();
  const selected = () => PARTS.find(p => p.id === state.selected);
  const busy = () => state.status === 'scanning';
  const allIn = () => PARTS.every(p => state.parts[p.id].mounted);
  function invalidate() {
    state.status = allIn() ? 'ready' : 'assembly';
    state.elapsed = 0; state.peak = null; state.saturated = 0;
    state.bars = Array(BINS).fill(0); state.dark = null;
  }
  function select(id) {
    if (busy() || !state.parts[id]) return false;
    state.selected = id;
    const p = selected();
    state.note = state.parts[id].mounted ? p.title+' 장착됨 · 분리로 선반에 돌려놓습니다.' :
      p.title+' 선택 · 목표 '+p.key+'° · 회전 후 '+p.mark+' 소켓 중앙에 놓으세요.';
    return true;
  }
  function turn(step) {
    if (busy()) return false;
    const p = selected();
    if (!p || state.parts[p.id].mounted) {
      state.note = '선반의 부품을 고르세요. 장착한 부품은 먼저 분리합니다.'; return false;
    }
    const part = state.parts[p.id];
    part.angle = wrap(part.angle + Math.sign(step) * 30);
    state.note = p.title+' '+part.angle+'° · '+p.mark+' 소켓의 기준은 '+p.key+'°입니다.'; return true;
  }
  function fit(id, x, y) {
    if (busy()) return false;
    const p = selected(), dock = PARTS.find(row => row.id === id);
    if (!p) { state.note = '먼저 선반에서 부품을 선택하세요.'; return false; }
    if (state.parts[p.id].mounted) { state.note = '장착한 부품은 분리 버튼으로 꺼냅니다.'; return false; }
    if (!dock || !Number.isFinite(x) || !Number.isFinite(y) ||
        Math.hypot(x - dock.socket[0], y - dock.socket[1]) > RADIUS) {
      state.note = '중심을 벗어났습니다. 부품은 선반으로 돌아갑니다.'; return false;
    }
    if (id !== p.id) { state.note = p.title+'는 '+p.mark+' 소켓에 맞습니다.'; return false; }
    const e = angularError(state.parts[id].angle, p.key);
    if (e > ANGLE_LIMIT) { state.note = '키 방향 차이 '+Math.round(e)+'° · '+p.key+'°에 맞추세요.'; return false; }
    state.parts[id].mounted = true; state.parts[id].angle = p.key;
    invalidate(); state.note = allIn() ? '광로 연결됨 · 암전을 눌러 기준값을 얻으세요.' : p.title+' 장착 · 다음 부품을 고르세요.';
    return true;
  }
  function eject() {
    if (busy()) return false;
    const p = selected();
    if (!p || !state.parts[p.id].mounted) { state.note = '분리할 장착 부품을 고르세요.'; return false; }
    state.parts[p.id].mounted = false; invalidate();
    state.note = p.title+' 분리 · 이전 기준값과 관측 결과를 지웠습니다.'; return true;
  }
  function exposure() {
    if (busy()) return false;
    state.gain = state.gain === 1 ? 4 : 1; invalidate();
    state.note = '노출 '+state.gain+'× · 조립한 뒤 같은 노출에서 암전을 다시 누르세요.'; return true;
  }
  function calibrate() {
    if (busy()) return false;
    if (!allIn()) { state.note = '세 부품을 모두 장착한 뒤 암전 기준을 얻으세요.'; return false; }
    invalidate(); state.dark = sample(state.gain).dark; state.status = 'calibrated';
    state.note = '암전 기준 저장 · 관측을 눌러 기준광의 스펙트럼을 읽으세요.'; return true;
  }
  function scan() {
    if (busy()) return false;
    if (!allIn() || !state.dark) { state.note = '광로 세 곳을 연결하고 현재 노출에서 암전을 실행하세요.'; return false; }
    state.status = 'scanning'; state.elapsed = 0; state.peak = null; state.saturated = 0; state.bars.fill(0);
    state.note = '검출기를 읽고 있습니다.'; return true;
  }
  function tick(dt) {
    if (!busy() || !Number.isFinite(dt) || dt < 0) return false;
    state.elapsed = Math.min(SCAN_TIME, state.elapsed + dt);
    const {raw} = sample(state.gain);
    const end = Math.floor(state.elapsed / SCAN_TIME * BINS);
    for (let i = 0; i < end; ++i) state.bars[i] = Math.max(0, raw[i] - state.dark[i]);
    if (end === BINS) {
      state.saturated = raw.filter(n => n === 255).length;
      state.status = state.saturated ? 'clipped' : 'measured';
      if (!state.saturated) state.peak = wavelength(state.bars.indexOf(Math.max(...state.bars)));
      state.note = state.saturated ? '포화 '+state.saturated+'칸 · 노출을 낮추고 암전부터 다시 측정하세요.' :
        '기준광 최대 '+state.peak+' nm · 세 봉우리를 분리해 읽었습니다.';
    }
    return true;
  }
  return {reset, select, turn, fit, eject, exposure, calibrate, scan, tick, read: () => structuredClone(state)};
}
