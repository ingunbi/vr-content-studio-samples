import * as THREE from '../../vendor/three.module.js';
import { CUES, STEMS, SIDES, LEVELS, CUE_SECONDS, X, Y, Z, openingScore, planScore } from './score.mjs';
import { makeBuffer, poseListener, schedule } from './audio.mjs';

const COLORS = [0x64e5e4, 0xffcb72, 0xfc846b];
const clamp = THREE.MathUtils.clamp;

export function build(api) {
  const {root,scene,camera,renderer} = api;
  const group = new THREE.Group();
  root.add(group);
  const previousBackground = scene.background;
  scene.background = new THREE.Color(0x101828);
  const material = (color, metalness = 0) => new THREE.MeshStandardMaterial({
    color, roughness: .68, metalness
  });
  const glow = color => new THREE.MeshBasicMaterial({color});
  const steel = material(0x283849,.45), wood = material(0xa56d47), dark = material(0x172234);
  const brass = material(0xb98850,.52);
  const warm = glow(0xffce83);
  const signal = COLORS.map(glow);
  function mesh(parent, geometry, mat, x, y, z) {
    const m = new THREE.Mesh(geometry,mat);
    m.position.set(x,y,z); parent.add(m); return m;
  }
  function box(parent,x,y,z,w,h,d,mat) {
    return mesh(parent,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  }
  function rod(parent,a,b,r,mat) {
    const v = new THREE.Vector3(...a), w = new THREE.Vector3(...b);
    const delta = w.clone().sub(v);
    const m = mesh(parent,new THREE.CylinderGeometry(r,r,delta.length(),8),mat,0,0,0);
    m.position.copy(v.add(w).multiplyScalar(.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return m;
  }
  function canvasPanel(parent,x,y,z,w,h,px,py) {
    const canvas = document.createElement('canvas');
    canvas.width = px; canvas.height = py;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const m = mesh(parent,new THREE.PlaneGeometry(w,h),
      new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),x,y,z);
    return {m,ctx:canvas.getContext('2d'),texture};
  }
  function print(ctx,text,x,y,size,color,align='center') {
    ctx.font = '600 '+size+'px "Malgun Gothic","Noto Sans KR",sans-serif';
    ctx.fillStyle=color; ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillText(text,x,y);
  }
  const envLight = new THREE.HemisphereLight(0xf2dbbb,0x293c59,1.8);
  const front = new THREE.DirectionalLight(0xffdead,1.9); front.position.set(-4,6,3);
  group.add(envLight,front);
  box(group,0,-.11,-2,17,.2,16,material(0x394c56));
  for (let j=0;j<9;j++) box(group,0,-.002,2-j*.68,15,.008,.014,steel);
  box(group,0,.045,-4.12,16,.05,.15,warm);
  box(group,0,-.10,-5.64,18,.12,2.7,dark);
  for(const z of [-5.0,-6.14]) box(group,0,.015,z,19,.09,.08,steel);
  for(let i=-14;i<15;i++) box(group,i*.62,-.025,-5.57,.24,.08,1.9,wood);
  for(const x of [-6,-3.8,3.8,6]) {
    box(group,x,1.98,-3.86,.14,3.94,.15,brass);
    rod(group,[x,3.15,-3.86],[x + (x<0?.7:-.7),3.86,-3.86],.055,brass);
  }
  for(let i=0;i<9;i++) {
    box(group,0,3.94,-4.1+i*.68,13,.09,.075,steel);
    if (i%3===0) box(group,0,3.86,-4.1+i*.68,5.8,.04,.05,warm);
  }
  box(group,0,4.04,-1.53,13,.12,6.45,material(0x344554));
  for (const x of [-4.7,4.7]) {
    for (let n=0;n<3;n++) box(group,x,.46+.035*n,-1.9-.12*n,1.45,.065,.1,wood);
    for(const dx of [-.52,.52]) box(group,x+dx,.23,-2.02,.08,.44,.30,steel);
  }
  // Distant buildings are baked into one canvas to keep the platform readable.
  const skyline = canvasPanel(group,0,3.1,-9,25,6.3,1400,350);
  const sky = skyline.ctx;
  const g = sky.createLinearGradient(0,0,0,350);
  g.addColorStop(0,'#151e37'); g.addColorStop(.72,'#664d64'); g.addColorStop(1,'#b38473');
  sky.fillStyle = g; sky.fillRect(0,0,1400,350);
  sky.fillStyle = '#f8dfac'; sky.beginPath(); sky.arc(315,70,27,0,Math.PI*2); sky.fill();
  for(let i=0;i<58;i++) {
    const w=16+((i*13)%19), h=40+((i*37)%100), x=i*25-10;
    sky.fillStyle=i%2?'#263344':'#33374b'; sky.fillRect(x,350-h,w,h);
    for(let k=0;k<5;k++) if((k+i)%3!==0){
      sky.fillStyle=(i+k)%4 ? '#ccb28e':'#a2bdc8'; sky.fillRect(x+4+(k%2)*9,357-h+Math.floor(k/2)*14,4,4);
    }
  }
  skyline.texture.needsUpdate=true;
  const train = new THREE.Group(); group.add(train); train.position.set(-2.0,0,-5.56);
  for (const cx of [-2.32,2.32]) {
    box(train,cx,1.13,0,4.5,1.52,1.30,material(0x31525f,.35));
    box(train,cx,1.93,0,4.45,.15,1.22,steel);
    box(train,cx,.74,.661,4.45,.13,.018,material(0xc67f4e));
    for(let i=0;i<6;i++) {
      const x=cx-1.78+i*.71;
      box(train,x,1.43,.665,.60,.52,.025,glow(i%4===0?0x949e97:0xf1c487));
      box(train,x,1.43,.683,.027,.52,.018,steel);
    }
    for(const dx of [-1.44,1.44]) {
      const wheel=mesh(train,new THREE.CylinderGeometry(.3,.3,.18,20),dark,cx+dx,.33,.54);
      wheel.rotation.x=Math.PI/2;
    }
  }
  const marque = canvasPanel(group,0,3.05,-3.75,3.75,.67,1000,180);
  function stationSign(title,sub) {
    const c=marque.ctx;c.fillStyle='#132b3b';c.fillRect(0,0,1000,180);
    c.strokeStyle='#a68057';c.lineWidth=4;c.strokeRect(9,9,982,162);
    print(c,title,500,68,61,'#ffe9c5');print(c,sub,500,131,31,'#89d8d2');marque.texture.needsUpdate=true;
  }
  // The station clock sweeps one turn per full performance and a third for a solo.
  const clock = new THREE.Group();clock.position.set(2.72,2.82,-3.72);group.add(clock);
  rod(clock,[0,.38,0],[0,1.02,0],.034,brass);
  const dial=mesh(clock,new THREE.CylinderGeometry(.41,.41,.10,48),brass,0,0,0);
  dial.rotation.x=Math.PI/2;
  mesh(clock,new THREE.CircleGeometry(.36,48),glow(0xf3dcae),0,0,.054);
  for(let i=0;i<12;i++){
    const theta=i*Math.PI/6;
    const tick=box(clock,.29*Math.sin(theta),.29*Math.cos(theta),.061,
      i%4===0?.023:.014,i%4===0?.079:.043,.012,dark);
    tick.rotation.z=-theta;
  }
  const hand=new THREE.Group();clock.add(hand);
  box(hand,0,.125,.078,.022,.25,.014,dark);
  mesh(clock,new THREE.CircleGeometry(.032,20),warm,0,0,.095);
  // Small signal lanterns follow each authored emitter position and show score activity.
  const beacons=STEMS.map((_,s)=>{
    const b=new THREE.Group();group.add(b);
    const ring=mesh(b,new THREE.TorusGeometry(.23,.025,8,38),signal[s],0,0,0);
    const glyph=s===0 ? new THREE.OctahedronGeometry(.09) : s===1 ?
      new THREE.ConeGeometry(.105,.18,12) : new THREE.BoxGeometry(.18,.105,.09);
    const core=mesh(b,glyph,signal[s],0,0,0);
    return {b,ring,core};
  });
  // Rain curtain outside the canopy, one line-segment draw call.
  const rainGeometry=new THREE.BufferGeometry();
  const drops=new Float32Array(108*6);
  for(let i=0;i<108;i++){
    const x=-7+((i*67)%140)/10, y=((i*43)%58)/10, z=-4.4-((i*31)%45)/10;
    drops.set([x,y,z,x-.044,y+.19,z],i*6);
  }
  rainGeometry.setAttribute('position',new THREE.BufferAttribute(drops,3));
  const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0x9cb9c7,transparent:true,opacity:.32}));
  group.add(rain);
  box(group,0,1.04,-.26,4.45,1.27,.17,steel);
  box(group,0,.38,-.42,3.95,.72,.36,dark);
  box(group,0,1.70,-.22,4.54,.054,.23,brass);
  const buttons=[];
  let score, cue, track, muted, running, pending, completed, dead=false, token=0;
  let context=null, buffers=null, voices=null;
  function button(id,x,y,w,text,fn,selected=()=>false,tint='#efca92') {
    const p=canvasPanel(group,x,y,-.161,w,.224,480,88);
    const controlNames={'level-up':'세기 높이기',side:'음원 위치 바꾸기',mute:'무음 전환'};
    p.m.name='sound-'+id; api.interactive(p.m,fn,typeof text==='string'?text:controlNames[id]);
    buttons.push({...p,text,selected,tint});
  }
  function redraw(){
    for(const p of buttons){
      const c=p.ctx,sel=p.selected();
      c.fillStyle=sel?'#476264':'#152832';c.fillRect(0,0,480,88);
      c.strokeStyle=sel?p.tint:'#58717e';c.lineWidth=sel?8:3;c.strokeRect(4,4,472,80);
      print(c,typeof p.text==='function'?p.text():p.text,240,42,41,sel?'#ffffff':p.tint);
      p.texture.needsUpdate=true;
    }
  }
  function progress(){
    if(!running)return 0;
    const clock=running.visualOnly ? performance.now()/1000 : context.currentTime;
    return clamp(clock-running.start,0,running.duration);
  }
  function readout(q=cue){
    const labels=score[q].map((cell,s)=>STEMS[s]+' '+cell.level).join('   ·   ');
    stationSign(running?(running.preview?'한 트랙 미리듣기':CUES[q]):'비 오는 밤의 소리극장',labels);
    const cell=score[cue][track];
    api.setHUD('비 오는 밤의 소리극장',
      (running?(running.preview?'미리듣는 중':'공연 중'):(completed?'공연 끝 · 다시 편집':'큐와 트랙 선택'))+
      '  |  '+CUES[cue]+' · '+STEMS[track]+' · 세기 '+cell.level+'/4 · '+SIDES[cell.side]+(muted?' · 무음':''));
    redraw();
  }
  function stop(notify=true){
    token++;pending=false;
    if(voices){voices.stop();voices=null;}
    running=null;
    if(notify)readout();
  }
  function edit(fn){
    if(running||pending){api.announce('정지를 누른 뒤 편집하세요.');return;}
    completed=false;fn();readout();
  }
  function setMute(){
    muted=!muted;voices?.mute(muted);
    if(running?.visualOnly && !muted){
      stop(false);api.announce('소리를 켰습니다. 공연을 다시 시작하세요.');
    }
    readout();
  }
  function reset(){
    stop(false);score=openingScore();cue=0;track=0;muted=false;completed=false;
    readout();updateStage(0,0,false);
  }
  const cameraPosition=new THREE.Vector3(), cameraQuat=new THREE.Quaternion();
  const forward=new THREE.Vector3(), up=new THREE.Vector3();
  function listen(){
    if(!context || context.state!=='running')return;
    const view=api.isXR()?renderer.xr.getCamera():camera;
    view.getWorldPosition(cameraPosition);view.getWorldQuaternion(cameraQuat);
    forward.set(0,0,-1).applyQuaternion(cameraQuat);up.set(0,1,0).applyQuaternion(cameraQuat);
    poseListener(context,cameraPosition,forward,up);
  }
  async function play(preview){
    if(running||pending){api.announce('현재 재생을 정지한 뒤 다시 시작하세요.');return;}
    const request=++token; pending=true;completed=false;
    try{
      if(!muted){
        if(!context || context.state==='closed'){context=new AudioContext();buffers=null;}
        if(context.state!=='running'){
          let timeout;
          try{
            await Promise.race([context.resume(),new Promise((_,reject)=>{
              timeout=setTimeout(()=>reject(new Error('audio activation')),1800);
            })]);
          }finally{clearTimeout(timeout);}
        }
        if(request!==token||dead)return;
        if(!buffers)buffers=STEMS.map((_,s)=>makeBuffer(context,s));
        listen();
      }
      if(request!==token||dead)return;
      const plan=planScore(score,cue,track,preview);
      const start=(muted?performance.now()/1000:context.currentTime)+.065;
      running={start,duration:plan.duration,preview,visualOnly:muted,lastCue:-1};
      if(!muted)voices=schedule(context,buffers,plan,start);
      pending=false;readout(preview?cue:0);
    }catch(e){
      if(dead||request!==token)return;
      stop(false);api.announce('오디오를 열지 못했습니다. 다시 누르거나 무음을 켜세요.');readout();
    }
  }
  const selectCue=i=>edit(()=>{cue=i;});
  const selectStem=i=>edit(()=>{track=i;});
  const level=delta=>edit(()=>{const cell=score[cue][track];cell.level=clamp(cell.level+delta,0,4);});
  const side=()=>edit(()=>{const cell=score[cue][track];cell.side=(cell.side+1)%3;});
  for(let i=0;i<3;i++){
    button('cue-'+i,(i-1)*1.41,1.51,1.34,(i+1)+'막  '+CUES[i],()=>selectCue(i),()=>cue===i);
    button('stem-'+i,(i-1)*1.41,1.25,1.34,STEMS[i],()=>selectStem(i),()=>track===i,'#a6e4da');
  }
  button('level-down',-1.67,.99,.83,'세기 −',()=>level(-1));
  button('level-up',-.76,.99,.90,()=> '세기 +  '+score[cue][track].level,()=>level(1));
  button('side',.49,.99,1.39,()=> '위치 · '+SIDES[score[cue][track].side],side);
  button('mute',1.71,.99,.83,()=>muted?'무음 켬':'무음',setMute,()=>muted);
  button('preview',-1.42,.73,1.34,'트랙 듣기',()=>play(true),()=>running?.preview);
  button('play',0,.73,1.34,'공연 재생',()=>play(false),()=>running&&!running.preview);
  button('stop',1.42,.73,1.34,'정지',()=>{stop();});
  function updateStage(q,seconds,active){
    hand.rotation.z=-Math.PI*2*(active ? seconds/12 : 0);
    score[q].forEach((cell,s)=>{
      const {b,ring,core}=beacons[s];
      b.position.set(X[cell.side],Y[s],Z[s]);
      const sounding=active && (!running?.preview||s===track) && cell.level>0;
      const beat=sounding ? (.5+.5*Math.sin(seconds*(s===1?7:4)+s))*cell.level/4 :0;
      ring.scale.setScalar(.66+beat*.9);core.scale.setScalar(.65+beat);
      core.rotation.y=seconds*.75;
    });
    train.position.x=running&&!running.preview ? -3.5+7*clamp(seconds/12,0,1):-2;
  }
  function handleKey(e){
    if(dead||e.repeat||e.ctrlKey||e.altKey||e.metaKey ||
      /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target?.tagName||''))return;
    const k=e.key.toLowerCase();
    if('123'.includes(k)&&k.length===1)selectCue(Number(k)-1);
    else if('456'.includes(k)&&k.length===1)selectStem(Number(k)-4);
    else if(k==='j')level(-1);else if(k==='k')level(1);else if(k==='n')side();
    else if(k==='p')play(true);else if(k==='u')setMute();
    else if(k===' '){e.preventDefault();if(running||pending)stop();else play(false);}
  }
  const hide=()=>{if(document.hidden&&!dead)stop();};
  const endXR=()=>{if(!dead)stop();};
  document.addEventListener('keydown',handleKey);
  document.addEventListener('visibilitychange',hide);
  renderer.xr.addEventListener('sessionend',endXR);
  api.onFrame((dt,elapsed)=>{
    if(dead)return;listen();
    rain.position.y=-(elapsed*.93 % .63);
    if(!running){updateStage(cue,0,false);return;}
    if(!running.visualOnly && context.state!=='running'){
      stop();api.announce('소리 장치가 일시 중단되어 공연을 멈췄습니다.');return;
    }
    const t=progress(), q=running.preview?cue:Math.min(2,Math.floor(t/CUE_SECONDS));
    if(q!==running.lastCue){running.lastCue=q;readout(q);}
    updateStage(q,t,true);
    if(t>=running.duration){
      completed=!running.preview;stop(false);readout();
      api.announce(completed?'세 막 공연을 마쳤습니다.':'트랙 미리듣기가 끝났습니다.');
    }
  });
  function dispose(){
    dead=true;stop(false);document.removeEventListener('keydown',handleKey);
    document.removeEventListener('visibilitychange',hide);renderer.xr.removeEventListener('sessionend',endXR);
    if(context&&context.state!=='closed')context.close().catch(()=>{});
    scene.background=previousBackground;
    const geos=new Set(), mats=new Set();
    group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});
    geos.forEach(item=>item.dispose());mats.forEach(item=>{item.map?.dispose();item.dispose();});
    root.remove(group);
  }
  reset();
  return {reset,dispose,getState:()=>({cue,track,muted,playing:!!running,pending,completed,
    activeCue:running?.lastCue??null, preview:running?.preview??false,
    score:score.map(row=>row.map(cell=>({...cell})))})};
}
