import * as THREE from '../vendor/three.module.js';

function box(group, color, size, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.72}));
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}
export function room(env) {
  const {scene} = env;
  scene.background = new THREE.Color('#182930');
  scene.fog = new THREE.FogExp2('#21373d', .041);
  const room = new THREE.Group();
  scene.add(room);
  scene.add(new THREE.HemisphereLight('#ffecce','#7898a4',2));
  const sun = new THREE.DirectionalLight('#fff0cf',2.8);
  sun.position.set(-3,6,4);
  scene.add(sun);
  box(room,'#435659',[16,.12,22],[0,-.06,-3]);
  box(room,'#536761',[13,5,.18],[0,2.5,-6]);
  for (let x=-6;x<=6;x+=1) {
    box(room,'#708379',[.025,4.8,.06],[x,2.4,-5.84]);
    box(room,'#788a80',[.022,.014,14],[x,.012,-2]);
  }
  for(let z=-5;z<=4;z++) box(room,'#788a80',[12,.012,.022],[0,.018,z]);
  for(let y=.6;y<4.8;y+=1) box(room,'#83958a',[12,.025,.04],[0,y,-5.80]);
  const targets = [];
  for(const [id,x,color] of [['ochre',-.95,'#e8a35d'],['jade',.95,'#73cac0']]) {
    const housing = new THREE.Group();
    housing.position.set(x,1.6,-2);
    room.add(housing);
    box(housing,'#2a4246',[1.44,1.82,.2],[0,0,-.17]);
    box(housing,'#506762',[.06,1.48,.14],[0,-1.08,-.17]);
    const face = box(housing,color,[1.24,1.56,.10],[0,0,0]);
    face.name = id;
    targets.push(face);
    for (let i=0;i<(id==='ochre'?1:2);i++){
      box(housing,'#26413f',[.12,.7,.02],[(i-(id==='ochre'?0:.5))*.3,0,.058]);
    }
  }
  return targets;
}
export function build(env) {
  room(env);
  env.help('눈높이를 바꾸며 한 줄 표식과 두 줄 표식이 수평선에 걸리는 위치를 비교하세요.');
  let low = false;
  function report() { env.say('눈높이 '+env.camera.position.y.toFixed(2)+' m · 표식 중심 1.60 m'); }
  env.button('눈높이 전환', () => { low = !low;env.camera.position.y = low ? 1.1 : 1.6;report(); });
  report();
  return {state:() => ({height:env.camera.position.y})};
}
