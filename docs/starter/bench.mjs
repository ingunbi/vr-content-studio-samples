import * as THREE from '../vendor/three.module.js';
const params = new URLSearchParams(location.search);
const index = Number(params.get('step') || 1) - 1;
const stages = ['./01-room.mjs','./02-ray.mjs','./03-press.mjs','./04-xr.mjs'];
const current = Number.isInteger(index) && stages[index] ? index : 0;
document.querySelectorAll('nav a')[current].setAttribute('aria-current', 'step');
const viewport = document.querySelector('#view');
const readout = document.querySelector('#readout');
function button(text, run) {
  const el = document.createElement('button');
  el.textContent = text;
  el.onclick = run;
  document.querySelector('#controls').append(el);
  return el;
}
async function start() {
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.append(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '시선 측정실 3D 창');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(57, 1, .045, 60);
  const rig = new THREE.Group();
  rig.position.z = 4;
  camera.position.y = 1.6;
  rig.add(camera);
  scene.add(rig);
  function resize() {
    if (renderer.xr.isPresenting) return;
    const w = viewport.clientWidth, h = viewport.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(viewport);
  resize();
  const steps = await import(stages[current]);
  const env = {scene,rig,camera,canvas,renderer,button,resize,
    help(text) { document.querySelector('#help').textContent = text; },
    say(text) { if(readout.textContent !== text) readout.textContent = text; }};
  const app = steps.build(env);
  renderer.setAnimationLoop((time, frame) => {
    app.frame?.(time, frame);
    renderer.render(scene,camera);
  });
  if(params.has('qa')) window.benchProbe = {
    state: () => structuredClone(app.state()),
    position: id => {
      const obj = scene.getObjectByName(id);
      if(!obj) return null;
      scene.updateMatrixWorld(true);
      const p = obj.getWorldPosition(new THREE.Vector3()).project(camera);
      const r = canvas.getBoundingClientRect();
      return {x:r.left + (p.x+1)*r.width/2, y:r.top+(1-p.y)*r.height/2};
    }
  };
}
start().catch(err => { readout.textContent = '측정실을 열 수 없습니다. '+err.message;console.error(err); });
