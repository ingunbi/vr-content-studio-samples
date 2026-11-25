import * as THREE from '../vendor/three.module.js';
import {room} from './01-room.mjs';

export function instrument(env) {
  const targets = room(env);
  const shutter = new THREE.Group();
  shutter.position.set(-.79,1.6,-1);
  env.scene.add(shutter);
  const mask = new THREE.Mesh(new THREE.BoxGeometry(1.13,1.43,.1),
    new THREE.MeshStandardMaterial({color:'#66544e',roughness:.9}));
  mask.name = 'mask';
  shutter.add(mask);
  for(let i=-2;i<=2;i++){
    const rib = new THREE.Mesh(new THREE.BoxGeometry(.94,.038,.018),
      new THREE.MeshBasicMaterial({color:'#c7b29b'}));
    rib.position.set(0,i*.2,.06);
    shutter.add(rib);
  }
  const candidates = [...targets,mask];
  const caster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function visible(mesh) {
    for(let p=mesh;p;p=p.parent) if(!p.visible) return false;
    return true;
  }
  function nearest() {
    env.scene.updateMatrixWorld(true);
    return caster.intersectObjects(candidates.filter(visible),false)[0] || null;
  }
  function fromPointer(e) {
    const rect = env.canvas.getBoundingClientRect();
    ndc.set(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height);
    env.camera.updateWorldMatrix(true,false);
    caster.setFromCamera(ndc,env.camera);
    return nearest();
  }
  function fromController(device) {
    device.updateWorldMatrix(true,false);
    caster.ray.origin.setFromMatrixPosition(device.matrixWorld);
    caster.ray.direction.set(0,0,-1).transformDirection(device.matrixWorld);
    return nearest();
  }
  return {shutter,fromPointer,fromController};
}
export const names = {ochre:'한 줄 표식',jade:'두 줄 표식',mask:'가림판'};
export function build(env) {
  const beam = instrument(env);
  let last = null;
  function read(e) {
    const hit = beam.fromPointer(e);
    last = hit ? {id:hit.object.name,distance:hit.distance} : null;
    env.say(hit ? names[last.id]+' · 광선 거리 '+last.distance.toFixed(2)+' m' : '표식 밖');
  }
  env.canvas.addEventListener('pointermove',read);
  env.canvas.addEventListener('pointerdown',read);
  env.button('가림판 전환',()=>{beam.shutter.visible=!beam.shutter.visible;last=null;env.say('다시 가리켜 거리를 읽으세요.');});
  env.help('왼쪽 표식을 겨눈 뒤 가림판을 걷고, 같은 지점에서 거리를 다시 읽으세요.');
  env.say('가림판이 내려와 있습니다.');
  return {state:()=>({mask:beam.shutter.visible,last})};
}
