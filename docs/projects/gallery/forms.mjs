import * as THREE from '../../vendor/three.module.js';

const metal = (color, roughness = .57, metalness = .35) => new THREE.MeshStandardMaterial({color, roughness, metalness});
const glow = color => new THREE.MeshBasicMaterial({color});
export function mesh(parent, geometry, material, x=0, y=0, z=0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x,y,z); parent.add(object); return object;
}
export function box(parent,w,h,d,m,x,y,z) { return mesh(parent,new THREE.BoxGeometry(w,h,d),m,x,y,z); }
export function rod(parent,a,b,radius,material) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), delta = q.clone().sub(p);
  const tube = mesh(parent,new THREE.CylinderGeometry(radius,radius,delta.length(),8),material);
  tube.position.copy(p).lerp(q,.5);
  tube.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()); return tube;
}
const disc = (group,r1,r2,height,mat,y) => mesh(group,new THREE.CylinderGeometry(r1,r2,height,54),mat,0,y,0);
export function plinth(parent,x,z) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x,0,z);
  const basalt = metal(0x24383c), band = metal(0xa38a5e);
  disc(g,.95,1.00,.15,basalt,.08); disc(g,.88,.94,.10,band,.205);
  disc(g,.78,.86,.40,basalt,.45); disc(g,.9,.78,.07,band,.68);
  disc(g,.9,.9,.04,metal(0x325458),.735);
  for(let i=0;i<24;i++){
    const a = i*Math.PI/12;
    rod(g,[.79*Math.cos(a),.61,.79*Math.sin(a)],[.84*Math.cos(a),.29,.84*Math.sin(a)],.009,band);
  }
  return g;
}

function ring() {
  const g=new THREE.Group(), brass=metal(0xcc9352,.31,.55), patina=metal(0x5c9887), pale=metal(0xebcf7d);
  const radii=[.76,.58,.40], tilts=[.25,-.85,.92];
  radii.forEach((r,i)=>{
    const hoop=new THREE.Group();g.add(hoop);hoop.rotation.set(.11+i*.13,tilts[i],.1-i*.16);
    mesh(hoop,new THREE.TorusGeometry(r,.028+i*.003,12,96,Math.PI*1.97),i===1?patina:brass);
    for(let j=0;j<36;j++){
      const a=j*Math.PI/18,L=j%6===0?.075:.034;
      rod(hoop,[(r-L)*Math.cos(a),(r-L)*Math.sin(a),.007],[r*Math.cos(a),r*Math.sin(a),.007],j%6===0?.012:.006,pale);
    }
    const a=[1.40,2.58,.54][i];
    mesh(hoop,new THREE.OctahedronGeometry(.057),glow(0xf2d990),r*Math.cos(a),r*Math.sin(a),.035);
    if(i===0){
      rod(hoop,[r,-.12,-.025],[r,.07,-.025],.028,patina);
      for(const y of [-.08,.044])mesh(hoop,new THREE.SphereGeometry(.035,10,8),pale,r,y,.01);
    }
  });
  mesh(g,new THREE.SphereGeometry(.084,18,12),glow(0xf2d990));
  rod(g,[0,-.84,0],[0,-.42,0],.051,brass);return g;
}
function mirror() {
  const g=new THREE.Group(), spine=metal(0x9c7958), edge=metal(0xdacc96);
  const triangles=[
    [[-.77,-.42],[.04,-.27],[-.17,.67],-.12,.09,0x8dd2c4],
    [[.10,-.23],[.76,-.48],[.47,.49],.21,-.18,0x589d9b],
    [[-.14,.73],[.44,.55],[.06,1.00],.15,.18,0xc1e7cc]
  ];
  for(const [a,b,c,rz,ry,color] of triangles){
    const shape=new THREE.Shape();shape.moveTo(...a);shape.lineTo(...b);shape.lineTo(...c);shape.closePath();
    const shard=new THREE.Group();g.add(shard);shard.rotation.set(rz,ry,0);
    mesh(shard,new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:1}),metal(color,.23,.48));
    for(const [p,q] of [[a,b],[b,c],[c,a]])rod(shard,[...p,.06],[...q,.06],.012,edge);
    const p=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,-.04];
    rod(g,[0,-.38,-.34],p,.036,spine);
  }
  rod(g,[0,-.88,-.17],[0,.70,-.38],.044,spine);return g;
}
function route() {
  const g=new THREE.Group(), colors=[0x7cacc6,0x426f89,0x91b6bc,0x446880];
  const xs=[-.79,-.40,0,.41,.80],zs=[0,.24,-.04,.23,-.02],ys=[-.27,.12,-.04,.31,.42];
  const white=glow(0xe1e5c8),brass=metal(0xc6a36b);
  for(let i=0;i<4;i++){
    const dx=xs[i+1]-xs[i],dz=zs[i+1]-zs[i];
    const plate=box(g,Math.hypot(dx,dz),1.18,.035,metal(colors[i],.61,.24),(xs[i]+xs[i+1])/2,.04,(zs[i]+zs[i+1])/2);
    plate.rotation.y=-Math.atan2(dz,dx);
    rod(g,[xs[i],ys[i],zs[i]+.036],[xs[i+1],ys[i+1],zs[i+1]+.036],.012,white);
    mesh(g,new THREE.SphereGeometry(.032,10,8),white,xs[i],ys[i],zs[i]+.039);
    for(let j=0;j<6;j++){
      const u=(j+.7)/7;
      mesh(g,new THREE.SphereGeometry(.009,6,4),white,xs[i]+u*dx,Math.sin(i*9+j*7)*.45,zs[i]+dz*u+.027);
    }
    if(i>0){
      for(const y of [-.42,.04,.42])rod(g,[xs[i],y-.061,zs[i]-.03],[xs[i],y+.061,zs[i]-.03],i===2?.04:.026,brass);
    }
  }
  mesh(g,new THREE.SphereGeometry(.032,10,8),white,xs[4],ys[4],zs[4]+.039);
  rod(g,[-.38,-.86,0],[-.38,-.51,.11],.03,brass);rod(g,[.38,-.86,0],[.38,-.51,.11],.03,brass);return g;
}
export function artifact(id) {return ({ring,mirror,route}[id])();}

function rng(seed=29){
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function moonMap(){
  const canvas=document.createElement('canvas'); canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d'),random=rng(71);
  c.fillStyle='#989995';c.fillRect(0,0,512,256);
  for(let i=0;i<3300;i++){
    const x=random()*512,y=random()*256,r=i<70?3+random()*16:.4+random()*3.5;
    const tone=Math.floor(95+random()*60);c.fillStyle='rgba('+tone+','+(tone+1)+','+(tone-2)+',.55)';
    c.beginPath();c.ellipse(x,y,r*1.5,r,0,0,Math.PI*2);c.fill();
    if(r>3){c.lineWidth=.5+r*.10;c.strokeStyle='rgba(225,220,204,.48)';c.beginPath();c.ellipse(x,y,r*1.5,r,0,1.15,3.8);c.stroke();}
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function architecture(api) {
  const g=api.root, world=api.scene;
  world.background=new THREE.Color(0x071722);
  const pale=glow(0xa8c9bb),brass=metal(0xb7955c),stone=metal(0x294347),dark=metal(0x172a31);
  world.add(new THREE.HemisphereLight(0xd3edf2,0x596353,1.75));
  const key=new THREE.DirectionalLight(0xffe3bc,3.3);key.position.set(-4,7,4);world.add(key);
  const rim=new THREE.DirectionalLight(0x67c3d3,2);rim.position.set(3,3,-7);world.add(rim);
  box(g,28,.16,18,dark,4,-.12,-1);
  for(const x of [-5,-3.25,0,3.25,5,12]){
    box(g,.012,.007,8,brass,x,-.028,-.8);
  }
  for(const z of [-3.4,-1.8,.1,2.3])box(g,11,.007,.018,brass,0,-.028,z);
  // A relay of curved ribs outlines the open window. Stars are geometry behind it.
  const ribMat=metal(0x466569);
  for(const z of [-5.6,-7.0,-8.45]){
    const points=[];
    for(let i=0;i<=40;i++){const a=i*Math.PI/40;points.push(new THREE.Vector3(5.75*Math.cos(a),.13+5.6*Math.sin(a),z));}
    mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,.09,8,false),ribMat);
    for(const s of [-1,1])box(g,.26,3.9,.24,stone,s*5.6,1.75,z);
  }
  const star=[],random=rng(2026);
  for(let i=0;i<720;i++)star.push((random()-.5)*65,random()*22-1,-12-random()*19);
  const sky=new THREE.BufferGeometry();sky.setAttribute('position',new THREE.Float32BufferAttribute(star,3));
  g.add(new THREE.Points(sky,new THREE.PointsMaterial({color:0xdce9df,size:.028,sizeAttenuation:true})));
  const moon=mesh(g,new THREE.SphereGeometry(1.7,48,32),new THREE.MeshStandardMaterial({map:moonMap(),roughness:.95}),-3.9,6.25,-15.8);
  moon.rotation.y=.53;
  // Central dais and a separate editorial bay keep play controls out of the opening view.
  for (const x of [-5.35,5.35]) {
    // Keep the front of the pier behind the reading cards at z = -2.28.
    box(g,.55,3.1,2.4,stone,x,1.5,-3.6);
    box(g,.025,2.72,.1,pale,x+(x<0?.282:-.282),1.5,-2.95);
  }
  box(g,7.1,3.9,.25,stone,12,1.91,-2.04);
  box(g,6.4,3.16,.12,dark,12,1.86,-1.86);
  for(const x of [8.8,15.2])box(g,.025,2.9,.05,brass,x,1.85,-1.76);
}
