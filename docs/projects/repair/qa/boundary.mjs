import assert from 'node:assert/strict';
import {PARTS, RADIUS, ANGLE_LIMIT, angularError, createBench, sample, SCAN_TIME} from '../model.mjs';
const results=[];
function check(name,fn){fn();results.push(name);}
function aligned(id){
  const bench=createBench(),part=PARTS.find(p=>p.id===id);
  bench.select(id);
  while(bench.read().parts[id].angle!==part.key)bench.turn(1);
  return {bench,part};
}
function complete(){
  const b=createBench();
  for(const p of PARTS){
    b.select(p.id);while(b.read().parts[p.id].angle!==p.key)b.turn(1);
    assert.equal(b.fit(p.id,...p.socket),true);
  }
  return b;
}
for(const [dx,dy,pass] of [[.14,0,true],[.17,0,false],[.12,.12,false],[0,0,true],[-.14,0,true]]){
  check('B center + '+dx+', '+dy,()=>{
    const {bench,part}=aligned('filter');
    assert.equal(bench.fit('filter',part.socket[0]+dx,part.socket[1]+dy),pass);
    assert.equal(bench.read().parts.filter.mounted,pass);
  });
}
check('coordinate is missing',()=>{const {bench}=aligned('mirror');assert.equal(bench.fit('mirror',NaN,1.4),false);});
check('wrap 359 to 1',()=>assert.equal(angularError(359,1),2));
check('angle just inside',()=>assert.ok(angularError(37.9,30)<ANGLE_LIMIT));
check('angle just outside',()=>assert.ok(angularError(38.1,30)>ANGLE_LIMIT));
check('distance contract and zero angle',()=>{assert.equal(RADIUS,.155);assert.equal(angularError(330,-30),0);});
check('data returned by read cannot mutate the workbench',()=>{
  const b=createBench();b.read().parts.sensor.mounted=true;assert.equal(b.read().parts.sensor.mounted,false);
});
check('exposure clears a completed observation',()=>{
  const b=complete();b.calibrate();b.scan();b.tick(SCAN_TIME);b.exposure();
  const s=b.read();assert.equal(s.gain,4);assert.equal(s.dark,null);assert.equal(s.peak,null);assert.equal(s.status,'ready');
  assert.ok(s.bars.every(v=>v===0));
});
check('scan locks optical path',()=>{
  const b=complete();b.calibrate();b.scan();const before=b.read();
  assert.deepEqual([b.select('filter'),b.turn(1),b.eject(),b.exposure(),b.calibrate(),b.scan()],Array(6).fill(false));
  assert.deepEqual(before,b.read());
});
check('half the scan shows the first half only',()=>{
  const b=complete();b.calibrate();b.scan();b.tick(SCAN_TIME/2);
  const a=b.read().bars;assert.ok(a.slice(0,18).every(v=>v>0));assert.ok(a.slice(18).every(v=>v===0));
});
check('reset during scan stops future progress',()=>{
  const b=complete();b.calibrate();b.scan();b.tick(.80);b.reset();
  const s=b.read();assert.equal(b.tick(3),false);assert.deepEqual(b.read(),s);
});
check('sensor ejected keeps knob but removes old dark frame',()=>{
  const b=complete();b.exposure();b.calibrate();b.eject();
  const s=b.read();assert.equal(s.dark,null);assert.equal(s.gain,4);assert.equal(s.parts.sensor.mounted,false);
});
check('saturation uses raw values',()=>{
  const {raw,dark}=sample(4);assert.deepEqual(raw.map((v,i)=>v===255?i:-1).filter(i=>i>=0),[17,18,19]);
  assert.deepEqual([17,18,19].map(i=>raw[i]-dark[i]),[234,233,232]);
});
console.log(JSON.stringify({runtime:process.version,passed:results.length,cases:results},null,2));
