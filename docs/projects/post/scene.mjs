import * as THREE from '../../vendor/three.module.js';
import {createRoute,ports,lanes,tide} from './route.mjs';
import {reviewPlan,decodePlan} from './chart-model.mjs';

const paint = color=>new THREE.MeshStandardMaterial({color,roughness:.85,flatShading:true});
function solid(parent,geo,mat,x,y,z){
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function box(p,mat,x,y,z,w,h,d){return solid(p,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
function cone(p,mat,x,y,z,r,h,n){return solid(p,new THREE.ConeGeometry(r,h,n),mat,x,y,z);}
function drum(p,mat,x,y,z,t,b,h,n=12){return solid(p,new THREE.CylinderGeometry(t,b,h,n),mat,x,y,z);}
function group(p,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;}
function rng(seed){return ()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);}

export function build(api) {
  const {root,scene,camera,rig}=api,route=createRoute(),rand=rng(8062);
  scene.background=new THREE.Color(0x9ed3da);scene.fog=new THREE.FogExp2(0xb5dce1,.027);
  scene.add(new THREE.HemisphereLight(0xfff1cc,0x94bdbd,2.3));
  const sun=new THREE.DirectionalLight(0xffe1b3,2.6);sun.position.set(-6,8,4);scene.add(sun);
  const stone=paint(0x617e80),stone2=paint(0xa7a39a),grass=paint(0x80b086),sand=paint(0xe0c697);
  const cream=paint(0xffe1ad),red=paint(0xb75236),slate=paint(0x35555e),wood=paint(0xa56e43);
  const dark=paint(0x243f4b),pine=paint(0x43785d),leaf=paint(0x599d77),teal=paint(0x288484),yellow=paint(0xffbe54);
  const seaMaterial=new THREE.ShaderMaterial({uniforms:{clock:{value:0}},vertexShader:
    'varying vec3 spot; void main(){vec4 p=modelMatrix*vec4(position,1.);spot=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:'varying vec3 spot; uniform float clock; void main(){float a=sin(spot.z*12.+sin(spot.x*2.1+clock*.3)*.8+clock*1.4);float b=sin(spot.x*4.9-spot.z*3.3+clock*.7);float ripple=smoothstep(.79,.98,a*b);vec3 c=mix(vec3(.045,.33,.40),vec3(.12,.48,.52),.5+.5*sin(spot.x*.7+spot.z*.55));c+=vec3(.10,.12,.10)*ripple;gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}'});
  const sea=solid(root,new THREE.PlaneGeometry(75,65),seaMaterial,0,-.13,-9);sea.rotation.x=-Math.PI/2;
  function tree(p,x,z,s){
    box(p,wood,x,.25*s,z,.09*s,.53*s,.09*s);
    cone(p,pine,x,.46*s,z,.32*s,.62*s,7);cone(p,leaf,x,.71*s,z,.24*s,.59*s,7);
  }
  function island(x,z,size,detail){
    const g=group(root,x,-.04,z),sx=size*(.9+rand()*.2);
    const base=drum(g,stone,0,0,0,sx*.92,sx,.37,8);base.scale.z=.71;
    const fringe=drum(g,sand,0,.16,0,sx*.91,sx*.99,.14,8);fringe.scale.z=.72;
    const top=drum(g,grass,0,.245,0,sx*.83,sx*.92,.10,8);top.scale.z=.7;
    const land=group(g,0,.29,0);
    for(let i=0;i<8;i++){
      const a=rand()*Math.PI*2;const rock=solid(g,new THREE.DodecahedronGeometry(size*(.05+rand()*.11)),i%2?stone:stone2,Math.cos(a)*sx,0,Math.sin(a)*sx*.72);rock.scale.y=1.4;
    }
    if(detail)detail(land);
    return g;
  }
  function cottage(p,x,z,s,roof){
    box(p,cream,x,.21*s,z,.58*s,.42*s,.42*s);
    const cap=cone(p,roof,x,.52*s,z,.48*s,.28*s,4);cap.rotation.y=Math.PI/4;cap.scale.z=.86;
    box(p,dark,x,.15*s,z+.215*s,.10*s,.27*s,.014*s);
    box(p,teal,x+.18*s,.24*s,z+.215*s,.09*s,.1*s,.015*s);
  }
  island(-3.55,1.27,1.18,p=>{cottage(p,-.27,0,.85,red);cottage(p,.05,-.35,.65,slate);tree(p,-.53,.34,.58);});
  island(-3.16,-2.09,1.07,p=>{cottage(p,-.34,.15,.64,red);box(p,cream,.17,.45,-.1,.34,.9,.33);cone(p,red,.17,1.06,-.1,.32,.39,4);for(const dx of [-.10,.10])box(p,dark,.17+dx,.75,.075,.075,.17,.012);tree(p,-.25,-.31,.83);});
  island(3.39,-1.96,1.15,p=>{
    drum(p,cream,0,.42,0,.19,.30,.84);drum(p,red,0,.57,0,.204,.24,.20);
    drum(p,dark,0,.94,0,.245,.245,.075);drum(p,yellow,0,1.095,0,.154,.154,.24,8);
    cone(p,red,0,1.30,0,.25,.20,8);cottage(p,.47,.08,.58,slate);tree(p,.42,-.27,.65);
  });
  island(3.09,1.52,.90,p=>{cottage(p,.13,-.12,.74,slate);tree(p,.36,.21,.70);});
  for(let i=0;i<8;i++){
    const x=-15+4.3*i,z=-10-rand()*2.3, r=1.4+rand()*1.8;
    island(x,z,r,p=>{for(let j=0;j<7;j++)tree(p,(rand()-.5)*r,(rand()-.5)*r*.62,1+rand());});
  }
  const shoal=group(root,.14,-.04,-1.64);
  for(let i=0;i<15;i++){const r=solid(shoal,new THREE.DodecahedronGeometry(.08+rand()*.10),stone2,(rand()-.5)*1.45,rand()*.1,(rand()-.5)*.42);r.scale.y=.85;}
  function tag(id,text,x,y,z,w,h,background,fn){
    const plate=api.makeLabel(text,{width:w,height:h,fontSize:62,color:'#fffaf0',background});
    plate.position.set(x,y,z);plate.name='post.'+id;plate.rotation.x=-.15;root.add(plate);
    if(fn)api.interactive(plate,()=>{fn();refresh();},text);
    return plate;
  }
  for(const [id,p] of Object.entries(ports)){
    const dock=group(root,p.x,.08,p.z);
    if(id==='buoy'){drum(dock,cream,0,.08,0,.085,.13,.23);cone(dock,red,0,.30,0,.08,.16,8);}
    else {box(dock,wood,0,.025,0,.55,.05,.27);for(let i=-2;i<=2;i++)box(dock,sand,i*.095,.058,0,.082,.02,.29);}
    tag(id,p.name,p.x,.78,p.z+.08,1.06,.28,'#234652',()=>route.append(id));
  }
  for(const [a,b,,rule] of lanes){
    const s=ports[a],e=ports[b],v=[new THREE.Vector3(s.x,-.015,s.z),new THREE.Vector3(e.x,-.015,e.z)];
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(v),new THREE.LineDashedMaterial({color:rule?0xffac55:0xc8ece3,dashSize:.10,gapSize:.10}));
    line.computeLineDistances();root.add(line);
  }
  const boat=group(root);boat.scale.setScalar(1.18);
  const hull=drum(boat,red,0,0,0,.21,.125,.15,8);hull.scale.z=1.82;
  box(boat,cream,0,.14,.01,.25,.19,.31);box(boat,slate,0,.256,.02,.28,.045,.32);
  box(boat,teal,0,.175,.171,.18,.079,.012);drum(boat,dark,0,.32,-.11,.045,.055,.13,8);
  box(boat,wood,0,.245,.22,.025,.35,.025);box(boat,yellow,.065,.382,.22,.13,.08,.015);
  const wake=new THREE.Group();boat.add(wake);
  for(const side of [-1,1]){const m=box(wake,cream,side*.16,-.03,-.42,.026,.014,.24);m.rotation.y=-side*.32;}
  const flags={};
  for(const id of ['bell','east']){
    const p=ports[id],flag=group(root,p.x-.25,.16,p.z-.25);drum(flag,wood,0,.27,0,.018,.018,.55);box(flag,yellow,.14,.47,0,.27,.15,.02);flags[id]=flag;
  }
  const barZ=2.45;
  tag('wait','1분 대기',-1.95,.61,barZ,.89,.28,'#315963',()=>route.append('wait'));
  tag('undo','한 칸 취소',-.95,.61,barZ,.89,.28,'#315963',()=>route.undo());
  tag('go','출항',0,.61,barZ,.82,.28,'#874626',()=>route.launch());
  tag('stop','다음 정박',.95,.61,barZ,.89,.28,'#315963',()=>route.stop());
  tag('again','새 항차',1.95,.61,barZ,.89,.28,'#315963',()=>reset());
  let schedule=null,lastText='',elapsed=0;
  function refresh(){
    const s=route.getState(),names=s.plan.map(id=>id==='wait'?'대기':ports[id].name).join(' → ');
    const title='해협 우편선  ·  '+s.time+'분  ·  '+(tide(s.time)==='high'?'만조':'간조')+'  ·  배달 '+s.delivered.length+'/2';
    const detail=(names?'예정  '+names+'   |   ':'')+s.message;
    api.setHUD(title,detail);
    if(lastText!==title+'|'+detail){
      lastText=title+'|'+detail;
      if(schedule){root.remove(schedule);schedule.geometry.dispose();schedule.material.map.dispose();schedule.material.dispose();}
      schedule=tag('schedule',title+'\n'+(names || s.message),0,2.45,-3.45,5.9,.54,'#193e4d',null);
    }
    for(const [id,f] of Object.entries(flags))f.visible=!s.delivered.includes(id);
    wake.visible=s.mode==='sail'&&!s.leg.wait;
  }
  function reset(){
    route.reset();
    if(!api.isXR()){api.teleport(0,6.65);camera.position.y=3.45;rig.updateMatrixWorld(true);camera.lookAt(0,.34,-.15);}
    refresh();
  }
  api.onFrame(dt=>{
    elapsed+=dt;seaMaterial.uniforms.clock.value=elapsed;
    const beforeTime=route.read().time,beforeMode=route.read().mode;
    route.advance(dt);
    const p=route.position();boat.position.set(p.x,.19+Math.sin(elapsed*3.1)*.012,p.z);boat.rotation.y=p.angle;boat.rotation.z=Math.sin(elapsed*2.1)*.024;
    if(beforeMode==='sail' && (route.read().time!==beforeTime || route.read().mode!==beforeMode))refresh();
    shoal.position.y=(tide(route.read().time)==='high'?-.11:-.025);
  });
  reset();
  function loadRoute(input){
    const steps=decodePlan(input), review=reviewPlan(steps);
    if(!review.ok){api.announce(review.reason);return;}
    for(const to of steps)route.append(to);
    refresh();
  }
  function journal(){
    const s=route.getState();
    return {format:'post-voyage-1',completed:s.mode==='done',lastPort:s.at,minute:s.time,delivered:s.delivered,arrivals:s.log};
  }
  return {reset,loadRoute,journal,getState:route.getState};
}
