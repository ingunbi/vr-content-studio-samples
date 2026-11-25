import * as THREE from '../../vendor/three.module.js';
import { WORKS, createArchive } from './archive.mjs';
import { architecture, artifact, plinth, mesh } from './forms.mjs';

const byId = id => WORKS.find(w => w.id === id);
const pale='#eee8cf', mint='#b7ded3', brass='#edc489';
const sideTitle = s => s === 'front' ? '앞면' : '옆면';
const lens = s => s === 'front' ? '관측' : '복원';
const boards = {floor:'#142d33', dark:'#14242b', active:'#2e554d', gold:'#594a31'};
function group(parent){const g=new THREE.Group();parent.add(g);return g;}
function placard(parent, x,y,z,w,h,options={}) {
  const canvas=document.createElement('canvas'), width=Math.min(1536,Math.ceil(w*235));
  canvas.width=width; canvas.height=Math.ceil(width*h/w);
  const ctx=canvas.getContext('2d'), tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const surface=mesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}),x,y,z);
  let oldKey='';
  function write(lines,background=options.background||boards.dark) {
    const key=JSON.stringify([lines,background]);if(key===oldKey)return;oldKey=key;
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle=background;ctx.fillRect(0,0,W,H);
    if(options.rail!==false){ctx.fillStyle=options.accent||'#8da69f';ctx.fillRect(0,0,Math.max(2,W*.009),H);}
    const lineH=H/lines.length;
    ctx.textBaseline='middle';
    lines.forEach((entry,i)=>{
      const [txt,color,size,heavy]=typeof entry==='string'?[entry,pale,.53,600]:entry;
      const desired=Math.max(12,lineH*(size||.53));
      let px=desired; const font=()=>(heavy||550)+' '+px+'px "Malgun Gothic","Noto Sans CJK KR",sans-serif';
      ctx.font=font();
      while(px>9 && ctx.measureText(txt).width>W*.90){px-=1;ctx.font=font();}
      ctx.fillStyle=color||pale;ctx.textAlign=options.center?'center':'left';
      ctx.fillText(txt,options.center?W/2:W*.054,lineH*(i+.5));
    });tex.needsUpdate=true;
  }
  return {surface,write};
}
export function build(api) {
  const model=createArchive(), room=api.root;
  architecture(api);
  const page=Object.fromEntries(['floor','study','desk','tour','end'].map(k=>[k,group(room)]));
  const objects={}, floor=page.floor, study=page.study, desk=page.desk, tour=page.tour, end=page.end;
  desk.position.x=12;end.position.x=12;
  const browseBack='전시장으로';
  function action(type,arg){return ()=>{if(model.act(type,arg)) refresh(type);};}
  function button(parent,id,x,y,z,w,h,caption,fn,color=boards.floor){
    const p=placard(parent,x,y,z,w,h,{center:true,accent:'#a6bdb1'});p.write([caption],color);
    p.surface.name='gallery.'+id;api.interactive(p.surface,fn,caption);return p;
  }
  function text(parent,x,y,z,w,h,lines,opts={}){
    const p=placard(parent,x,y,z,w,h,opts);p.write(lines);return p;
  }
  for(const w of WORKS){
    plinth(room,w.x,-3.15);
    const o=artifact(w.id);o.position.set(w.x,1.62,-3.15);room.add(o);objects[w.id]=o;
    const panel=placard(floor,w.x,.71,-2.20,1.64,.43,{accent:w.color});
    panel.write([[w.accession+'   /   작품 열람',mint,.42],[w.name,pale,.74,700]]);
    panel.surface.name='gallery.open.'+w.id;api.interactive(panel.surface,action('study',w.id),w.name+' 열람');
    const hit=mesh(floor,new THREE.BoxGeometry(1.84,1.70,.66),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}),w.x,1.70,-3.14);
    hit.name='gallery.object.'+w.id;api.interactive(hit,action('study',w.id),w.name+' 열람');
  }
  const title=text(floor,0,3.47,-5.45,4.15,.63,[
    ['SELENE   /   PRIVATE COLLECTION',brass,.36,560],['달의 기록관',pale,.87,680]],{center:true,rail:false});
  title.surface.rotation.x=.025;
  button(floor,'floor.desk',0,.36,-.85,1.77,.36,'편집대로 이동',action('desk'),boards.gold);

  // On-site reading cards sit beside the piece. Form and card stay in view together.
  const read=text(study,1.25,2.03,-2.28,2.34,.98,['작품'],{accent:'#cfab70'});
  read.surface.name='gallery.study.text';
  const left=button(study,'study.front',.63,1.28,-2.26,1.08,.30,'앞면 보기',action('view','front'));
  const right=button(study,'study.side',1.82,1.28,-2.26,1.08,.30,'옆면 보기',action('view','side'));
  const jot=button(study,'study.record',1.22,.91,-2.24,2.26,.31,'현재 단서 채록',action('record'),boards.active);
  button(study,'study.floor',.63,.52,-2.23,1.08,.28,browseBack,action('home'));
  button(study,'study.desk',1.82,.52,-2.23,1.08,.28,'편집대로',action('desk'));

  const deskHead=text(desk,0,3.04,-1.77,5.68,.52,['편집대'],{accent:'#ccad79'});
  const rows=WORKS.map((_,i)=>{
    const y=2.37-i*.48;
    const name=button(desk,'desk.row'+i+'.study',-1.92,y,-1.75,1.75,.38,'작품 열람',()=>action('study',model.get().order[i])());
    const f=button(desk,'desk.row'+i+'.front',-.38,y,-1.75,1.18,.38,'관측 해설',()=>action('caption',[model.get().order[i],'front'])());
    const s=button(desk,'desk.row'+i+'.side',.91,y,-1.75,1.18,.38,'복원 해설',()=>action('caption',[model.get().order[i],'side'])());
    button(desk,'desk.row'+i+'.earlier',2.21,y,-1.75,1.2,.38,'한 칸 앞으로',()=>action('earlier',model.get().order[i])());
    return {name,f,s};
  });
  const feedback=text(desk,0,.91,-1.75,5.68,.32,['편집 안내'],{accent:'#cba36a'});
  button(desk,'desk.floor',-1.42,.48,-1.74,2.76,.36,browseBack,action('home'));
  button(desk,'desk.publish',1.47,.48,-1.74,2.70,.36,'전시 열기',action('publish'),boards.gold);

  const caption=text(tour,1.25,1.92,-2.27,2.42,1.02,['전시'],{accent:'#d9bd82'});
  caption.surface.name='gallery.tour.text';
  const prev=button(tour,'tour.previous',.59,1.13,-2.25,1.03,.34,'이전 작품',action('previous'));
  const next=button(tour,'tour.next',1.88,1.13,-2.25,1.25,.34,'다음 작품',action('next'),boards.gold);
  button(tour,'tour.desk',1.25,.68,-2.23,2.36,.32,'편집대로',action('desk'));
  const receipt=text(end,0,2.02,-1.75,5.10,1.90,['전시 기록'],{accent:'#b99f71'});
  button(end,'end.desk',-1.21,.73,-1.74,2.26,.4,'순서와 해설 고치기',action('desk'),boards.active);
  button(end,'end.floor',1.21,.73,-1.74,2.26,.4,browseBack,action('home'));

  function refresh(why) {
    const s=model.get();
    for(const [k,g] of Object.entries(page))g.visible=k===s.mode;
    for(const o of Object.values(objects))o.rotation.y=0;
    let status='';
    if(s.mode==='floor'){
      api.teleport(0,4);status='작품이나 명패를 선택해 열람하세요. 채록한 단서는 편집대에서 해설의 근거가 됩니다.';
      api.setHUD('달의 기록관',status);
    }else if(s.mode==='study'){
      const w=byId(s.focus), seen=s.evidence[w.id].includes(s.view);
      study.position.x=w.x+1.04;objects[w.id].rotation.y=s.view==='side'?-Math.PI*65/180:0;
      if(why==='study'||why==='view')api.teleport(w.x+(s.view==='side'?1.40:1.10),1.66);
      read.write([[w.accession+'   /   '+sideTitle(s.view)+' 기록',brass,.47],[w.name,pale,.83,700],[w.evidence[s.view],mint,.60]]);
      left.write(['앞면 보기'],s.view==='front'?boards.active:boards.dark);
      right.write(['옆면 보기'],s.view==='side'?boards.active:boards.dark);
      jot.write([seen?'채록됨  ·  수첩에 보관':'현재 단서 채록'],seen?boards.dark:boards.active);
      status=s.message||w.evidence[s.view];
      api.setHUD(w.name+' · '+sideTitle(s.view),status);
    }else if(s.mode==='desk'){
      if(why==='desk')api.teleport(12,3.55);
      deskHead.write([['CURATORIAL DESK   /   원고 편집',brass,.44],['순서와 해설을 정해 전시를 여세요',pale,.73,650]]);
      for(const [i,id] of s.order.entries()){
        const w=byId(id),r=rows[i];
        r.name.write([[(i+1)+'   '+w.name,pale,.56,640]]);
        for(const [side,b] of [['front',r.f],['side',r.s]]){
          const has=s.evidence[id].includes(side),chosen=s.captions[id]===side;
          b.write([[lens(side)+(chosen?' 선택':' 해설'),pale,.69],[has?'단서 있음':'채록 전',mint,.52]],chosen?boards.active:boards.dark);
        }
      }
      status=s.message||'작품 이름을 누르면 다시 열람합니다. 해설에 맞는 단서를 수첩에 담아 주세요.';
      feedback.write([[status,s.message?brass:mint,.61]]);
      api.setHUD('전시 편집대',status);
    }else if(s.mode==='tour'){
      const item=s.edition[s.cursor],w=byId(item.id);
      tour.position.x=w.x+1.04;objects[item.id].rotation.y=item.side==='side'?-Math.PI*65/180:0;
      api.teleport(w.x+1.10,1.66);
      caption.write([['전시 '+s.editions+'호   ·   '+(s.cursor+1)+' / 3   ·   '+lens(item.side),brass,.48],
        [w.name,pale,.72,700],[w.captions[item.side],mint,.61]]);
      prev.surface.visible=s.cursor>0;next.write([s.cursor===2?'관람 마치기':'다음 작품'],boards.gold);
      status=w.captions[item.side];api.setHUD('관람 중 · '+w.name,status);
    }else{
      api.teleport(12,3.55);
      receipt.write([['ARCHIVE EDITION   /   '+s.editions,brass,.47],['전시 관람을 마쳤습니다',pale,.8,650],
        ...s.edition.map((i,p)=>[(p+1)+'   '+byId(i.id).name+'  ·  '+byId(i.id).captions[i.side],mint,.57])]);
      status=s.edition.map(i=>byId(i.id).name).join(' → ');api.setHUD('전시 기록',status);
    }
    if(s.message)api.announce(s.message);
  }
  const reset=()=>{model.reset();refresh('reset');};
  reset();return {reset,getState:model.get};
}
