import * as THREE from '../../vendor/three.module.js';
import {PARTS, WORK_Z, RADIUS, SCAN_TIME, BINS, createBench} from './model.mjs';

const DEG = Math.PI / 180;
const C = {dark:0x121d24, steel:0x40535a, cream:0xe0d9bd, orange:0xf07b42, green:0x79e1b7, blue:0x72c9e7};
const material = (color, metalness=.30, roughness=.5) => new THREE.MeshStandardMaterial({color, metalness, roughness});
const plain = color => new THREE.MeshBasicMaterial({color});

function addMesh(parent, geometry, mat, x,y,z) {
  const m = new THREE.Mesh(geometry,mat); m.position.set(x,y,z); parent.add(m); return m;
}
function box(parent,size,mat,x,y,z) { return addMesh(parent,new THREE.BoxGeometry(...size),mat,x,y,z); }
function plate(parent,r,depth,segments,mat,x,y,z) {
  const m=addMesh(parent,new THREE.CylinderGeometry(r,r,depth,segments),mat,x,y,z);
  m.rotation.x=Math.PI/2; return m;
}
function ring(parent,r,tube,mat,x,y,z,segments=40) {
  return addMesh(parent,new THREE.TorusGeometry(r,tube,8,segments),mat,x,y,z);
}
function display(parent,w,h,x,y,z,pixelsWide,pixelsHigh) {
  const c=document.createElement('canvas'); c.width=pixelsWide; c.height=pixelsHigh;
  const texture=new THREE.CanvasTexture(c); texture.colorSpace=THREE.SRGBColorSpace;
  const panel=addMesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}),x,y,z);
  const ctx=c.getContext('2d');
  return {panel, draw(paint){ctx.save();paint(ctx,c.width,c.height);ctx.restore();texture.needsUpdate=true;}};
}
function text(ctx,t,x,y,size,color,align='left',weight='600') {
  ctx.font=weight+' '+size+'px "Malgun Gothic","Noto Sans KR",sans-serif';
  ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillStyle=color; ctx.fillText(t,x,y);
}
function sign(parent,title,w,h,x,y,z,fg='#dcebe9',bg='#17272b') {
  const width=Math.max(128,Math.round(w*420)),height=Math.max(48,Math.round(h*420));
  const d=display(parent,w,h,x,y,z,width,height);
  d.draw((g,W,H)=>{g.fillStyle=bg;g.fillRect(0,0,W,H);
    text(g,title,W/2,H/2,Math.min(H*.66,W/(title.length*.85+1)),fg,'center');});
  return d.panel;
}
function planetMaterial() {
  const c=document.createElement('canvas'); c.width=768;c.height=384;
  const g=c.getContext('2d'), layer=g.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++){
    const u=x/c.width*2*Math.PI, v=y/c.height;
    const bend=v+.013*Math.sin(3*u+7*v)+.007*Math.sin(8*u-11*v);
    const cloud=.5+.5*Math.sin(bend*72+.8*Math.sin(5*u+4*v));
    const fine=.5+.5*Math.cos(282*bend+1.9*Math.cos(3*u));
    const t=.12+.61*cloud+.17*fine+.09*Math.cos(v*Math.PI*2);
    const k=(y*c.width+x)*4;
    layer.data[k]=76+132*t;layer.data[k+1]=50+105*t;layer.data[k+2]=58+56*t;layer.data[k+3]=255;
  }
  g.putImageData(layer,0,0);
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,roughness:1,metalness:0});
}

function surroundings(root, mats) {
  const dome = addMesh(root,new THREE.SphereGeometry(34,32,20),
    new THREE.MeshBasicMaterial({color:0x071321,side:THREE.BackSide}),0,2,0);
  let seed=98173;
  const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const points=[];
  for(let i=0;i<540;i++){
    const az=random()*Math.PI*2, cy=random()*2-1, r=25, q=Math.sqrt(1-cy*cy);
    points.push(r*q*Math.cos(az),r*cy+2,r*q*Math.sin(az));
  }
  const stars=new THREE.BufferGeometry();
  stars.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  root.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xdfedff,size:.034,sizeAttenuation:true})));
  const planet=addMesh(root,new THREE.SphereGeometry(2.9,72,40),planetMaterial(),3.75,3.9,-6.8);
  planet.rotation.z=-.20;
  const belt=new THREE.Group();belt.position.copy(planet.position);belt.rotation.set(1.19,-.28,-.34);root.add(belt);
  for(const [a,b,col] of [[3.12,3.24,0x635858],[3.30,3.65,0xb7a390],[3.70,3.86,0x9d8273],[3.96,4.02,0xcdbeb2]]){
    addMesh(belt,new THREE.RingGeometry(a,b,100),new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide}),0,0,0);
  }
  // A pressure frame around the window leaves the sky visible over the workstation.
  box(root,[12,.15,9],mats.dark,0,-.105,.4);
  for(const x of [-3.65,3.65]){
    box(root,[.21,4.6,3.9],mats.dark,x,2,0);
    box(root,[.075,3.5,.08],mats.lamp,x*.97,1.9,-1.3);
  }
  box(root,[7.4,.24,.24],mats.steel,0,3.77,-1.4);
  for(const x of [-2.96,-1.82,1.82,2.96]){
    const arch=box(root,[.12,1.7,.14],mats.steel,x,3.21,-1.50);arch.rotation.z=x<0?-.55:.55;
  }
  for(let i=0;i<6;i++)box(root,[.05,.008,6.5],mats.steel,(i-2.5)*1.0,-.021,0);
  for(const x of [-1.6,1.6])box(root,[.23,1.1,.5],mats.steel,x,.48,.04);
  box(root,[4.35,.14,1.28],mats.steel,0,.37,.15);
  box(root,[4.2,.055,.055],mats.lamp,0,.40,.77);
  return {dome,planet};
}
function partMesh(root,p,mats) {
  const group=new THREE.Group();group.name=p.id+'-body';root.add(group);
  const enamel=material(p.color,.28,.35);
  if(p.id==='mirror'){
    plate(group,.175,.09,6,mats.dark,0,0,0);
    plate(group,.151,.037,6,enamel,0,0,.062);
    plate(group,.122,.015,6,mats.glass,0,0,.085);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;plate(group,.011,.014,8,mats.dark,.144*Math.sin(a),.144*Math.cos(a),.009+.078);}
  }else if(p.id==='filter'){
    plate(group,.16,.065,40,mats.dark,0,0,0);ring(group,.133,.024,enamel,0,0,.049);
    plate(group,.112,.016,42,mats.glass,0,0,.054);
    for(let i=-2;i<=2;i++)box(group,[.17,.008,.004],mats.lamp,0,i*.031,.067);
  }else{
    box(group,[.30,.25,.09],mats.dark,0,0,0);box(group,[.263,.205,.025],enamel,0,0,.058);
    box(group,[.161,.115,.018],mats.glass,0,0,.081);
    for(let i=-2;i<=2;i++)box(group,[.023,.049,.027],mats.brass,i*.043,-.145,.01);
  }
  // The long radial pointer makes a rotated symmetric shape unambiguous.
  box(group,[.023,.067,.026],mats.lamp,0,.142,.107);
  return group;
}

export function build(api) {
  const {root, scene}=api;
  const bench=createBench();
  const mats={dark:material(C.dark),steel:material(C.steel),cream:material(C.cream,.24,.61),
    brass:material(0xcb9454,.7,.31), glass:material(0x79c2d4,.54,.21),
    lamp:plain(0xc1efd6), dim:plain(0x335a5b),orange:material(C.orange,.2,.38)};
  scene.background=new THREE.Color(0x09121b);
  const ambient=new THREE.HemisphereLight(0xe4f4ff,0x60504a,1.7);root.add(ambient);
  const key=new THREE.DirectionalLight(0xffdebe,2.7);key.position.set(-3,5,4);root.add(key);
  const rim=new THREE.DirectionalLight(0x6ebad6,1.6);rim.position.set(3,.8,2);root.add(rim);
  const far=surroundings(root,mats);
  box(root,[1.05,2.08,.19],mats.dark,-1.43,1.48,.20);
  box(root,[2.54,1.91,.22],mats.cream,.36,1.41,.22);
  box(root,[2.38,.64,.08],mats.dark,.36,1.43,.37);
  for(const x of [-.81,1.53])for(const y of [.53,2.31])
    plate(root,.026,.019,8,mats.steel,x,y,.351);
  sign(root,'ORBITAL OPTICS   /   궤도 정비소',2.39,.13,.36,2.57,.30,'#f6c385','#18232b');
  sign(root,'부품 선반',.87,.115,-1.43,2.41,.324);
  const chart=display(root,2.30,.54,.36,2.055,.348,1000,235);
  const info=display(root,2.29,.19,.36,1.002,.352,1100,90);
  const hotMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
  const hotZones=new Map(),models=new Map(),lights=new Map();
  const socketLights=[];
  function zone(id,x,y,z,w,h,label,cb) {
    const m=box(root,[w,h,.024],hotMaterial,x,y,z);m.name=id;
    hotZones.set(m,id);api.interactive(m,cb||(()=>{}),label);return m;
  }
  for(const p of PARTS){
    const [x,y]=p.home,[sx,sy]=p.socket;
    box(root,[.87,.44,.055],mats.steel,x,y,.332);
    const light=box(root,[.04,.44,.03],mats.dim,x-.424,y,.368);lights.set(p.id,light);
    sign(root,p.mark+'  '+p.title,.42,.091,x+.17,y-.149,.465);
    zone('tray-'+p.id,x,y,.615,.83,.46,p.title+' 선반');
    const item=partMesh(root,p,mats);models.set(p.id,item);
    plate(root,.221,.069,p.id==='mirror'?6:p.id==='filter'?40:4,mats.steel,sx,sy,.439);
    const halo=ring(root,.194,.012,mats.dim,sx,sy,.489);socketLights.push(halo);
    plate(root,.141,.021,p.id==='mirror'?6:p.id==='filter'?40:4,mats.dark,sx,sy,.481);
    const a=p.key*DEG;
    const keymark=box(root,[.023,.062,.015],mats.lamp,sx-.173*Math.sin(a),sy+.173*Math.cos(a),.504);keymark.rotation.z=a;
    sign(root,p.mark+'  '+p.key+'°',.49,.084,sx,sy-.252,.433);
    zone('dock-'+p.id,sx,sy,WORK_Z,.43,.43,p.mark+' 소켓 · '+p.key+'°');
  }
  const controls=[
    ['minus','↻  −30°',-.56,.80,.52],['plus','+30°  ↺',.04,.80,.52],
    ['eject','분리',.62,.80,.48],['exposure','노출 전환',1.20,.80,.52],
    ['dark','암전',-.48,.565,.62],['scan','관측',.30,.565,.75],['reset','처음부터',1.12,.565,.64]
  ];
  const turn=(s)=>bench.turn(s);
  let press=null, scanVisible=false, lastProgress=-1;
  const plane=new THREE.Plane(new THREE.Vector3(0,0,1),-WORK_Z);
  function project(ray){
    if(!ray)return null;
    const point=ray.intersectPlane(plane,new THREE.Vector3());
    return point&&Number.isFinite(point.x)&&Number.isFinite(point.y)?point:null;
  }
  function graph(s) {
    chart.draw((g,w,h)=>{
      g.fillStyle='#101e26';g.fillRect(0,0,w,h);
      const titles={assembly:'광로 조립',ready:'암전 대기',calibrated:'암전 기준 저장',scanning:'기준광 판독 중',measured:'최대 '+s.peak+' nm',clipped:'포화 '+s.saturated+'칸'};
      text(g,titles[s.status],24,32,29,s.status==='clipped'?'#ffa777':'#c9eee7');
      text(g,'노출 '+s.gain+'×',w-22,34,22,'#d3b58f','right');
      for(let i=0;i<4;i++){g.fillStyle='#263a42';g.fillRect(26,67+i*39,w-52,1);}
      for(let i=0;i<BINS;i++){
        const x=28+i*(w-56)/BINS, val=s.bars[i], bh=129*val/255;
        g.fillStyle= s.status==='clipped'&&val>=220 ? '#ff906f' : 'hsl('+(208-i*4.5)+',67%,65%)';
        g.fillRect(x,186-Math.max(2,bh),(w-56)/BINS-5,Math.max(2,bh));
      }
      for(const [v,x] of [['420 nm',27],['510',w*.515],['595',w-27]])
        text(g,v,x,209,17,'#a6babd',x===27?'left':x>w*.8?'right':'center','400');
    });
  }
  function sync(announce=true) {
    const s=bench.read();
    PARTS.forEach((p,i)=>{
      const part=s.parts[p.id],body=models.get(p.id);
      const [x,y]=part.mounted?p.socket:p.home;
      body.position.set(x,y,part.mounted?.526:.425);
      body.rotation.z=part.angle*DEG;lights.get(p.id).material=s.selected===p.id?mats.lamp:mats.dim;
      socketLights[i].material=part.mounted?mats.lamp:mats.dim;
    });
    info.draw((g,w,h)=>{
      g.fillStyle='#213039';g.fillRect(0,0,w,h);
      const p=PARTS.find(x=>x.id===s.selected);
      text(g,p?p.mark+' '+p.title+'  '+s.parts[p.id].angle+'°  /  기준 '+p.key+'°':'선반에서 부품을 선택하세요',18,23,27,'#ffce90');
      text(g,s.note,18,66,24,'#e8ede8','left','500');
    });
    graph(s);api.setHUD('궤도 정비소',s.note);
    if(announce && api.announce)api.announce(s.note);
    scanVisible=s.status==='scanning';lastProgress=-1;
  }
  const actions={minus:()=>turn(-1),plus:()=>turn(1),eject:()=>bench.eject(),exposure:()=>bench.exposure(),
    dark:()=>bench.calibrate(),scan:()=>bench.scan(),reset:()=>bench.reset()};
  function command(id){if(press&&id!=='reset')return;press=null;actions[id]();sync();}
  for(const [id,title,x,y,w] of controls){
    box(root,[w,.17,.058],id==='scan'?mats.orange:mats.steel,x,y,.359);
    sign(root,title,w-.03,.12,x,y,.396,id==='scan'?'#1c2229':'#eceddf',id==='scan'?'#ed9e60':'#354a51');
    zone('cmd-'+id,x,y,.445,w,.18,title,()=>command(id));
  }
  const getZone = object => {
    for(let o=object;o;o=o.parent)if(hotZones.has(o))return hotZones.get(o);
    return '';
  };
  function attemptAt(pt){
    if(!pt)return bench.fit(null,NaN,NaN);
    const dock=PARTS.find(p=>Math.hypot(pt.x-p.socket[0],pt.y-p.socket[1])<=RADIUS);
    return bench.fit(dock?.id,pt.x,pt.y);
  }
  api.onAction(e=>{
    if(e.type==='cancel'){if(press?.source===e.source){press=null;sync(false);}return;}
    const id=getZone(e.object),pt=project(e.ray);
    if(e.type==='down'){
      if(press || !pt || bench.read().status==='scanning')return;
      if(id.startsWith('tray-')){
        const part=id.slice(5);bench.select(part);sync();
        if(!bench.read().parts[part].mounted)press={kind:'drag',id:part,start:pt,source:e.source};
      }else if(id.startsWith('dock-')){
        const target=id.slice(5),s=bench.read();
        if(s.parts[target].mounted){bench.select(target);sync();}
        else press={kind:'place',id:target,start:pt,source:e.source};
      }
      return;
    }
    if(e.type!=='up'||!press||press.source!==e.source)return;
    const last=press;press=null;
    if(last.kind==='drag'){
      if(!pt||pt.distanceTo(last.start)>.075)attemptAt(pt);
    }else if(id==='dock-'+last.id)attemptAt(pt);
    sync();
  });
  api.onFrame((dt,_time,aim)=>{
    far.planet.rotation.y+=dt*.018;
    if(press?.kind==='drag' && aim?.source===press.source){
      const p=project(aim.ray);
      if(p&&p.distanceTo(press.start)>.075)models.get(press.id).position.set(
        THREE.MathUtils.clamp(p.x,-2.1,1.8),THREE.MathUtils.clamp(p.y,.5,2.5),WORK_Z);
    }
    if(scanVisible&&bench.tick(dt)){
      const s=bench.read(),n=Math.floor(s.elapsed/SCAN_TIME*BINS);
      if(s.status!=='scanning')sync();
      else if(n!==lastProgress){graph(s);lastProgress=n;}
    }
  });
  const strokes={KeyJ:'minus',KeyL:'plus',KeyU:'eject',KeyT:'exposure',KeyC:'dark',KeyO:'scan',KeyR:'reset'};
  function keyboard(e){
    if(!root.parent || press || api.isXR() || e.repeat || e.ctrlKey||e.altKey||e.metaKey || e.target?.matches?.('input,textarea,select,[contenteditable=true]'))return;
    if(/^Digit[1-3]$/.test(e.code)){bench.select(PARTS[Number(e.code.slice(-1))-1].id);sync();}
    else if(e.code==='KeyF'){const p=PARTS.find(v=>v.id===bench.read().selected);if(p)bench.fit(p.id,...p.socket);sync();}
    else if(strokes[e.code])command(strokes[e.code]);
    else return;
    e.preventDefault();
  }
  window.addEventListener('keydown',keyboard);
  function reset(){press=null;bench.reset();sync(false);}
  reset();
  return {reset,getState:bench.read,dispose(){window.removeEventListener('keydown',keyboard);}};
}
