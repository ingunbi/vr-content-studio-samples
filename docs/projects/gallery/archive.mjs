// All three objects and their histories belong to the fictional lunar archive.
export const WORKS = [
  {
    id: 'ring', name: '밤눈 고리', accession: 'L–12', color: '#d29c57', x: -3.25,
    evidence: { front: '세 개의 눈금이 서로 다른 원 위에 있다.', side: '바깥 고리의 이음매를 작은 핀이 잇는다.' },
    captions: { front: '세 눈금으로 같은 별을 다시 찾다', side: '부러진 바깥 고리를 핀으로 잇다' }
  },
  {
    id: 'mirror', name: '조각 거울', accession: 'L–07', color: '#9edace', x: 0,
    evidence: { front: '세 거울 조각의 기울기가 서로 다르다.', side: '거울 뒤의 버팀대가 세 조각을 붙든다.' },
    captions: { front: '세 방향의 빛을 한자리로 모으다', side: '흩어진 조각에 새 받침을 대다' }
  },
  {
    id: 'route', name: '접힌 항로', accession: 'L–31', color: '#86abc9', x: 3.25,
    evidence: { front: '흰 점과 선이 네 면에 걸쳐 이어진다.', side: '서로 다른 경첩이 접힌 면을 맞물린다.' },
    captions: { front: '접힌 면을 건너 관측 길을 읽다', side: '다른 경첩으로 길의 이음을 살리다' }
  }
];
export const SIDES = ['front', 'side'];
const ids = WORKS.map(w => w.id);
const work = id => WORKS.find(w => w.id === id);
const validId = id => ids.includes(id);
const validSide = side => SIDES.includes(side);
const initial = () => ({
  mode: 'floor', focus: null, view: 'front', evidence: Object.fromEntries(ids.map(id => [id, []])),
  captions: Object.fromEntries(ids.map(id => [id, null])), order: [...ids],
  edition: null, cursor: 0, editions: 0, message: ''
});

export function createArchive() {
  let s = initial();
  function missing() {
    const needs = [];
    for (const id of s.order) {
      const side = s.captions[id];
      if (!side) needs.push(work(id).name + ' 해설을 선택하세요.');
      else if (!s.evidence[id].includes(side)) needs.push(work(id).name + ' ' + (side === 'front' ? '앞면' : '옆면') + ' 단서를 채록하세요.');
    }
    return needs;
  }
  function act(type, arg) {
    s.message = '';
    switch (type) {
      case 'home':
        s.mode = 'floor'; s.focus = null; break;
      case 'study':
        if (!validId(arg)) return false;
        s.mode = 'study'; s.focus = arg; s.view = 'front'; break;
      case 'view':
        if (s.mode !== 'study' || !validSide(arg)) return false;
        s.view = arg; break;
      case 'record': {
        if (s.mode !== 'study') return false;
        const found = s.evidence[s.focus];
        if (found.includes(s.view)) s.message = '이미 채록한 단서입니다.';
        else { found.push(s.view); s.message = '단서 수첩에 남겼습니다.'; }
        break;
      }
      case 'desk':
        s.mode = 'desk'; s.focus = null; break;
      case 'caption': {
        const [id, side] = Array.isArray(arg) ? arg : [];
        if (s.mode !== 'desk' || !validId(id) || !validSide(side)) return false;
        s.captions[id] = side; break;
      }
      case 'earlier': {
        if (s.mode !== 'desk' || !validId(arg)) return false;
        const p = s.order.indexOf(arg);
        if (p === 0) s.message = '이미 첫 작품입니다.';
        else [s.order[p - 1], s.order[p]] = [s.order[p], s.order[p - 1]];
        break;
      }
      case 'publish': {
        if (s.mode !== 'desk') return false;
        const needs = missing();
        if (needs.length) { s.message = needs[0]; break; }
        s.edition = s.order.map(id => ({id, side: s.captions[id]}));
        s.editions++; s.mode = 'tour'; s.cursor = 0; break;
      }
      case 'next':
        if (s.mode !== 'tour') return false;
        if (s.cursor === s.edition.length - 1) s.mode = 'end';
        else s.cursor++;
        break;
      case 'previous':
        if (s.mode !== 'tour' || s.cursor === 0) return false;
        s.cursor--; break;
      default: return false;
    }
    return true;
  }
  return {
    act, missing, get: () => JSON.parse(JSON.stringify(s)),
    reset() { s = initial(); }
  };
}
