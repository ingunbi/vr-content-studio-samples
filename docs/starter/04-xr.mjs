import * as THREE from '../vendor/three.module.js';
import {station} from './03-press.mjs';
import {names} from './02-ray.mjs';

function indicator(scene) {
  const face = document.createElement('canvas');
  face.width = 768;face.height = 144;
  const ctx = face.getContext('2d');
  const map = new THREE.CanvasTexture(face);
  map.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.7,.50),
    new THREE.MeshBasicMaterial({map,toneMapped:false}));
  plate.position.set(0,2.96,-2.2);
  scene.add(plate);
  return text => {
    ctx.fillStyle='#172d32';ctx.fillRect(0,0,face.width,face.height);
    ctx.font='600 53px "Malgun Gothic",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#f8d89e';ctx.fillText(text,384,72,742);map.needsUpdate=true;
  };
}
export function build(env) {
  const {renderer,rig,camera} = env;
  const app = station(env);
  const display = indicator(env.scene);
  let session = null, opening = false, before = null, previous = null;
  const controls = [];
  const poseSpace = new THREE.Object3D();
  poseSpace.matrixAutoUpdate=false;
  rig.add(poseSpace);
  renderer.xr.enabled=true;
  renderer.xr.setReferenceSpaceType('local-floor');
  for(let i=0;i<2;i++){
    const device=renderer.xr.getController(i);
    rig.add(device);
    const beam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),
      new THREE.LineBasicMaterial({color:'#ffdb93'}));
    beam.visible=false;device.add(beam);
    const slot={device,beam,source:null};
    controls.push(slot);
    device.addEventListener('connected',e=>{slot.source=e.data;});
    device.addEventListener('disconnected',()=>{
      app.gate.cancel(slot.source);slot.source=null;beam.visible=false;
    });
  }
  function readPose(frame,source) {
    const ref=renderer.xr.getReferenceSpace();
    if(!frame || !ref || !source || session?.visibilityState!=='visible')return null;
    return frame.getPose(source.targetRaySpace,ref);
  }
  function intersectPose(pose) {
    poseSpace.matrix.fromArray(pose.transform.matrix);
    return app.beam.fromController(poseSpace);
  }
  function select(e) {
    const source=e.inputSource;
    const pose=readPose(e.frame,source);
    if(!pose){app.gate.cancel(source);return;}
    const id=app.idOf(intersectPose(pose));
    if(e.type==='selectstart')app.gate.down(source,id);
    else app.gate.up(source,id);
  }
  function lost() {
    if(session?.visibilityState==='visible')return;
    app.gate.clear();
    for(const {beam} of controls)beam.visible=false;
  }
  const vr=env.button('VR 연결 확인 중',async()=>{
    if(opening)return;
    if(session){await session.end();return;}
    opening=true;vr.disabled=true;
    let next;
    try{
      next=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
      session=next;
      before={position:camera.position.clone(),rotation:camera.rotation.clone()};
      app.gate.clear();
      session.addEventListener('selectstart',select);
      session.addEventListener('selectend',select);
      session.addEventListener('visibilitychange',lost);
      await renderer.xr.setSession(session);
      session.addEventListener('end',finish,{once:true});
      vr.disabled=false;vr.textContent='VR 나가기';
    }catch(err){
      if(next)await next.end().catch(()=>{});
      finish();env.say('세션을 열 수 없습니다. '+err.name);
    }finally{opening=false;}
  });
  async function support(){
    try {
      const ok=!!navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');
      if(session)return;
      vr.disabled=!ok;vr.textContent=ok?'VR 입장':'VR 기기 필요';
    }catch{if(!session){vr.disabled=true;vr.textContent='VR 연결 확인';}}
  }
  function finish(){
    session=null;app.gate.clear();
    for(const {beam} of controls)beam.visible=false;
    if(before){camera.position.copy(before.position);camera.rotation.copy(before.rotation);before=null;}
    env.resize();support();
  }
  vr.disabled=true;support();
  navigator.xr?.addEventListener('devicechange',support);
  env.help('데스크톱에서 먼저 선택을 시험하세요. 연결 가능한 헤드셋에서는 VR 입장을 누르고 표식 위에서 선택을 누르고 놓으세요.');
  env.say('누적 0회');
  function frame(t,xrFrame){
    if(session && xrFrame){
      for(const {source,beam} of controls){
        const pose=readPose(xrFrame,source);
        beam.visible=!!pose;
        if(!pose){app.gate.cancel(source);continue;}
        const hit=intersectPose(pose);
        beam.scale.z=hit?Math.min(8,hit.distance):4;
      }
    }
    const {count,last}=app.state();
    if(count!==previous){display(last?names[last]+' · '+count+'회':'표식을 선택하세요');previous=count;}
  }
  return {frame,state:()=>({...app.state(),presenting:renderer.xr.isPresenting,button:vr.textContent})};
}
