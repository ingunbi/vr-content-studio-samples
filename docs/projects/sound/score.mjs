export const CUES = ['도착 전', '문 열림', '출발 뒤'];
export const STEMS = ['지붕 비', '승강장 종', '막차 저음'];
export const SIDES = ['왼쪽', '가운데', '오른쪽'];
export const LEVELS = [0, 0.18, 0.36, 0.58, 0.82];
export const CUE_SECONDS = 4;
export const X = [-2.6, 0, 2.6];
export const Y = [2.6, 1.95, 1.05];
export const Z = [-2.5, -3.0, -3.5];
export function openingScore() {
  const levels = [[3, 0, 1], [2, 3, 2], [1, 0, 4]];
  const sides = [[0, 1, 2], [0, 1, 1], [0, 1, 0]];
  return levels.map((row, cue) =>
    row.map((level, track) => ({ level, side: sides[cue][track] })));
}

export function planScore(score, cue, track, preview) {
  const events = [];
  const sequence = preview ? [cue] : [0, 1, 2];
  sequence.forEach((q, order) => {
    score[q].forEach((cell, stem) => {
      if ((preview && stem !== track) || cell.level === 0) return;
      events.push({ cue: q, stem, offset: order * CUE_SECONDS,
        level: LEVELS[cell.level], side: cell.side });
    });
  });
  return { duration: sequence.length * CUE_SECONDS, events };
}
