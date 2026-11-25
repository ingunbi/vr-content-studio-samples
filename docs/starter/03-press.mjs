import {instrument,names} from './02-ray.mjs';

export function latch(commit) {
  const held = new Map();
  return {
    down(source,id) { if(!held.has(source) && id) held.set(source,id); },
    up(source,id) {
      const first = held.get(source);
      held.delete(source);
      if(first && first === id) {commit(id);return true;}
      return false;
    },
    cancel(source) {held.delete(source);},
    clear() {held.clear();},
    size() {return held.size;}
  };
}
export function station(env) {
  const beam = instrument(env);
  beam.shutter.visible = false;
  let count = 0, last = null;
  const gate = latch(id => {
    count++;last=id;
    env.say(names[id]+' 선택 · 누적 '+count+'회');
  });
  const idOf = hit => hit && hit.object.name !== 'mask' ? hit.object.name : null;
  env.canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0 || env.renderer.xr.isPresenting)return;
    env.canvas.setPointerCapture(e.pointerId);
    const id = idOf(beam.fromPointer(e));gate.down(e.pointerId,id);
    env.say(id ? names[id]+' 누름' : '표식 밖');
  });
  env.canvas.addEventListener('pointerup',e=>{
    if(e.button!==0 || env.renderer.xr.isPresenting)return;
    if(!gate.up(e.pointerId,idOf(beam.fromPointer(e))))env.say('선택 취소 · 누적 '+count+'회');
  });
  for(const type of ['pointercancel','lostpointercapture'])env.canvas.addEventListener(type,e=>gate.cancel(e.pointerId));
  window.addEventListener('blur',()=>gate.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)gate.clear();});
  return {beam,gate,idOf,state:()=>({count,last,held:gate.size()})};
}
export function build(env) {
  const app = station(env);
  env.help('한 표식에서 누르고 다른 표식에서 놓으세요. 이어서 같은 표식에서 누르고 놓아 결과를 비교하세요.');
  env.say('누적 0회');
  return app;
}
