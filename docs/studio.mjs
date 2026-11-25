import * as THREE from './vendor/three.module.js';

const byId = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const works = {gallery:'달의 기록관',repair:'궤도 정비소',sound:'비 오는 밤의 소리극장',post:'해협 우편선'};
const project = params.get('project');
if (Object.hasOwn(works, project)) {
  byId('player').hidden = false;
  byId('name').textContent = works[project];
  start().catch(error => {
    byId('notice').textContent = '작품을 열 수 없습니다. WebGL을 사용할 수 있는 브라우저에서 새로 고쳐 주세요. ' + error.message;
    console.error(error);
  });
} else {
  byId('library').hidden = false;
}

function makeLabel(text, {width=1, height=.22, color='#ffffff', background='transparent', fontSize=48}={}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(256, Math.min(2048, Math.round(width / height * 192)));
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  const lines = String(text).split('\n');
  const size = Math.min(100, fontSize*1.6, 150/lines.length);
  ctx.font = '600 '+size+'px "Malgun Gothic",sans-serif';
  ctx.fillStyle = color; ctx.textAlign='center'; ctx.textBaseline='middle';
  lines.forEach((line,i)=>ctx.fillText(line,canvas.width/2,canvas.height/2+(i-(lines.length-1)/2)*size*1.2,canvas.width-12));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
}

async function start() {
  const stage=byId('stage');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.xr.enabled=true;
  renderer.xr.setReferenceSpaceType('local-floor');
  stage.appendChild(renderer.domElement);
  const canvas=renderer.domElement;
  canvas.tabIndex=0;canvas.setAttribute('aria-label',works[project]+' 3D 조작 화면');
  const scene=new THREE.Scene(), root=new THREE.Group(), rig=new THREE.Group();
  const camera=new THREE.PerspectiveCamera(57,1,.045,170);
  rig.position.set(0,0,4);camera.position.y=1.6;camera.rotation.order='YXZ';
  scene.add(root,rig);rig.add(camera);
  function size(){
    if(renderer.xr.isPresenting)return;
    const w=stage.clientWidth,h=stage.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  }
  size();window.addEventListener('resize',size);
  const hits=new Map(), frameListeners=[], actionListeners=[];
  const caster=new THREE.Raycaster(), cursor=new THREE.Vector2(0,0), euler=new THREE.Quaternion();
  const mouseRay=new THREE.Ray();
  const devices=[], inputs=new Map(), pressed=new Map();
  let recentDevice=null, gesture=null, rightDrag=null, touchLook=null, focusText='', noticeTimer;
  let xrCard=null, liveTitle='',liveSub='', app=null, oldCamera=null;
  const isXR=()=>renderer.xr.isPresenting;
  function visible(object){
    for(let item=object;item;item=item.parent) if(!item.visible)return false;
    return true;
  }
  function updateXRCard() {
    if(xrCard){camera.remove(xrCard);xrCard.material.map.dispose();xrCard.material.dispose();xrCard.geometry.dispose();xrCard=null;}
    if(!isXR() || !liveTitle)return;
    xrCard=makeLabel(liveTitle+'\n'+liveSub,{width:1.12,height:.16,background:'rgba(9,20,31,.78)',fontSize:32});
    xrCard.position.set(0,-.39,-1.5);camera.add(xrCard);
  }
  function setHUD(title,subtitle='') {
    if(liveTitle===title && liveSub===subtitle)return;
    liveTitle=title;liveSub=subtitle;byId('title').textContent=title;byId('subtitle').textContent=subtitle;
    updateXRCard();
  }
  function announce(text){
    clearTimeout(noticeTimer);byId('notice').textContent=text;
    noticeTimer=setTimeout(()=>{byId('notice').textContent='';},3800);
  }
  function interactive(mesh,action,label=''){
    hits.set(mesh,{action,label});return mesh;
  }
  function teleport(x,z){
    const viewer=isXR()?renderer.xr.getCamera():camera;
    const head=viewer.getWorldPosition(new THREE.Vector3());
    rig.position.x+=x-head.x;rig.position.z+=z-head.z;rig.updateMatrixWorld(true);
  }
  function setCursor(event){
    const rect=canvas.getBoundingClientRect();
    cursor.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  }
  function desktopRay(){
    camera.updateWorldMatrix(true,false);caster.setFromCamera(cursor,camera);
    return mouseRay.copy(caster.ray);
  }
  function controllerRay(device){
    const ray=device.userData.studioRay;
    device.getWorldPosition(ray.origin);
    ray.direction.set(0,0,-1).applyQuaternion(device.getWorldQuaternion(euler)).normalize();
    return ray;
  }
  function lookup(ray){
    if(!ray)return {object:null,point:null,distance:5};
    caster.ray.copy(ray);scene.updateMatrixWorld();
    const surfaces=[...hits.keys()].filter(visible);
    for(const hit of caster.intersectObjects(surfaces,true)){
      if(!visible(hit.object))continue;
      let object=hit.object;
      while(object && !hits.has(object))object=object.parent;
      if(object)return {object,point:hit.point,distance:hit.distance};
    }
    return {object:null,point:null,distance:5};
  }
  function emit(type,source,ray){
    const hit=lookup(ray);
    const evt={type,source,ray:ray?.clone() || null,...hit};
    if(type==='down')pressed.set(source,hit.object);
    const origin=pressed.get(source);
    if(type==='up' || type==='cancel')pressed.delete(source);
    for(const fn of actionListeners)fn(evt);
    if(type==='up' && hit.object && origin===hit.object && visible(hit.object))hits.get(hit.object)?.action?.(evt);
  }
  function cancel(){
    for(const source of [...pressed.keys()])emit('cancel',source,null);
    gesture=null;rightDrag=null;touchLook=null;
  }
  function turn(dx,dy){
    camera.rotation.y-=dx*.004;
    camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-dy*.004,-1.35,1.35);
  }
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(isXR() || gesture || rightDrag)return;
    canvas.focus();setCursor(e);
    if(e.button===2){rightDrag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
    if(e.button!==0)return;
    canvas.setPointerCapture(e.pointerId);
    if(e.pointerType==='touch' && !lookup(desktopRay()).object){touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};return;}
    gesture={id:e.pointerId};emit('down','mouse',desktopRay());
  });
  canvas.addEventListener('pointermove',e=>{
    if(isXR())return;
    const drag=rightDrag || touchLook;
    if(drag && drag.id===e.pointerId){turn(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}
    setCursor(e);
  });
  canvas.addEventListener('pointerup',e=>{
    if(rightDrag?.id===e.pointerId)rightDrag=null;
    if(touchLook?.id===e.pointerId)touchLook=null;
    if(gesture?.id===e.pointerId){gesture=null;setCursor(e);emit('up','mouse',desktopRay());}
  });
  canvas.addEventListener('pointercancel',cancel);
  window.addEventListener('blur',cancel);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  window.addEventListener('keydown',e=>{
    if(isXR() || e.target.closest?.('button,a,input,textarea,select'))return;
    const step={ArrowLeft:[-17,0],ArrowRight:[17,0],ArrowUp:[0,-17],ArrowDown:[0,17]}[e.key];
    if(step){e.preventDefault();turn(...step);cursor.set(0,0);}
    if(e.key==='Enter' && !e.repeat){e.preventDefault();cursor.set(0,0);emit('down','keyboard',desktopRay());}
  });
  window.addEventListener('keyup',e=>{
    if(e.key==='Enter' && pressed.has('keyboard')){e.preventDefault();cursor.set(0,0);emit('up','keyboard',desktopRay());}
  });
  for(let i=0;i<2;i++){
    const device=renderer.xr.getController(i);rig.add(device);devices.push(device);
    device.userData.studioRay=new THREE.Ray();
    const beam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),
      new THREE.LineBasicMaterial({color:0x91e9df,transparent:true,opacity:.76}));
    beam.name='studio.pointer';device.add(beam);
    device.addEventListener('connected',e=>inputs.set(device,e.data));
    device.addEventListener('disconnected',()=>{if(inputs.has(device))emit('cancel',inputs.get(device),null);inputs.delete(device);if(recentDevice===device)recentDevice=null;});
    for(const [name,type] of [['selectstart','down'],['selectend','up']]){
      device.addEventListener(name,()=>{
        const source=inputs.get(device);if(!source || !device.visible)return;
        recentDevice=device;emit(type,source,controllerRay(device));
      });
    }
  }
  byId('help').onclick=()=>{const guide=byId('guide');guide.hidden=!guide.hidden;byId('help').setAttribute('aria-expanded',String(!guide.hidden));};
  byId('reset').onclick=()=>{cancel();if(!isXR()){camera.rotation.set(0,0,0);rig.position.set(0,0,4);camera.position.set(0,1.6,0);}app?.reset();};
  const module=await import('./projects/'+project+'/scene.mjs');
  app=module.build({scene,root,renderer,camera,rig,interactive,setHUD,onFrame:fn=>frameListeners.push(fn),
    onAction:fn=>actionListeners.push(fn),teleport,isXR,makeLabel,announce});
  app.reset();
  if(project==='post'){
    const chart=document.createElement('a');chart.href='./projects/post/chart.html';chart.textContent='항해 작업지';byId('help').before(chart);
    const journal=document.createElement('button');journal.textContent='일지 저장';byId('help').before(journal);
    journal.onclick=()=>{
      const a=document.createElement('a'), url=URL.createObjectURL(new Blob([JSON.stringify(app.journal(),null,2)],{type:'application/json'}));
      a.href=url;a.download='우편선_항해일지.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
    };
    if(params.has('route'))app.loadRoute(params.get('route'));
  }
  const vr=byId('enterVR');
  async function checkVR(){
    try {const yes=!!navigator.xr && await navigator.xr.isSessionSupported('immersive-vr');vr.disabled=!yes;vr.textContent=yes?'VR 입장':'VR 기기 필요';}
    catch {vr.disabled=true;vr.textContent='VR 연결 확인';}
  }
  checkVR();navigator.xr?.addEventListener('devicechange',checkVR);
  vr.onclick=async()=>{
    let session;
    try{
      if(isXR()){await renderer.xr.getSession().end();return;}
      vr.disabled=true;session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
      oldCamera={pos:camera.position.clone(),rot:camera.rotation.clone()};
      cancel();await renderer.xr.setSession(session);vr.disabled=false;vr.textContent='VR 나가기';updateXRCard();
      session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible')cancel();});
      session.addEventListener('end',()=>{cancel();if(oldCamera){camera.position.copy(oldCamera.pos);camera.rotation.copy(oldCamera.rot);}
        updateXRCard();size();checkVR();},{once:true});
    } catch(error){if(session)await session.end().catch(()=>{});announce('VR 세션을 열지 못했습니다. '+error.name);checkVR();}
  };
  let previous=null, elapsed=0;
  renderer.setAnimationLoop(ms=>{
    const dt=previous===null?0:Math.min(.10,Math.max(0,(ms-previous)/1000));previous=ms;elapsed+=dt;
    let ray,source;
    if(isXR()){
      for(const device of devices){
        if(!device.visible && pressed.has(inputs.get(device)))emit('cancel',inputs.get(device),null);
        if(device.visible)device.children.find(c=>c.name==='studio.pointer').scale.z=Math.min(8,lookup(controllerRay(device)).distance);
      }
      const active=recentDevice?.visible?recentDevice:devices.find(d=>d.visible && inputs.get(d)?.handedness==='right') || devices.find(d=>d.visible);
      ray=active?controllerRay(active):null;source=active?inputs.get(active):null;
    }else {ray=desktopRay();source=pressed.has('keyboard')?'keyboard':'mouse';}
    const hit=lookup(ray), label=hits.get(hit.object)?.label || '';
    if(label!==focusText){focusText=label;byId('focus').textContent=label;canvas.style.cursor=label?'pointer':'default';}
    for(const fn of frameListeners)fn(dt,elapsed,{ray,source,object:hit.object,point:hit.point});
    renderer.render(scene,camera);
  });
  window.addEventListener('pagehide',()=>{cancel();app.dispose?.();});
  if(params.has('qa'))window.studioProbe={
    state:()=>structuredClone(app.getState()),
    targets:()=>{scene.updateMatrixWorld(true);return [...hits.keys()].filter(visible).map(object=>{
      const v=new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(camera), r=canvas.getBoundingClientRect();
      return {name:object.name,label:hits.get(object).label,x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,inView:Math.abs(v.x)<=1&&Math.abs(v.y)<=1&&v.z>=-1&&v.z<=1};
    });},
    camera:()=>camera.getWorldPosition(new THREE.Vector3()).toArray()
  };
}
