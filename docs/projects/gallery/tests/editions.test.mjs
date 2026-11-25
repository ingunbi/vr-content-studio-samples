import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORKS } from '../archive.mjs';
import { compileRoute } from './walk-edition.mjs';
test('six orders and eight caption combinations produce the requested 48 tours',()=>{
  const distinct=new Set();
  for(const a of WORKS)for(const b of WORKS)for(const c of WORKS){
    if(new Set([a.id,b.id,c.id]).size!==3)continue;
    for(let mask=0;mask<8;mask++){
      const desired=[a,b,c].map((w,i)=>({id:w.id,side:mask&(1<<i)?'side':'front'}));
      const draft=compileRoute(desired);
      assert.deepEqual(draft.get().edition,desired);
      distinct.add(JSON.stringify(draft.get().edition));
      for(const [i,w] of desired.entries()){
        const s=draft.get();assert.equal(s.mode,'tour');assert.equal(s.cursor,i);
        assert.deepEqual(s.edition[s.cursor],w);draft.act('next');
      }
      assert.equal(draft.get().mode,'end');
    }
  }
  assert.equal(distinct.size,48);
});
test('a route cannot silently use duplicate works or a face outside its catalogue',()=>{
  assert.throws(()=>compileRoute([{id:'ring',side:'front'},{id:'ring',side:'side'},{id:'route',side:'front'}]));
  assert.throws(()=>compileRoute([{id:'ring',side:'back'},{id:'mirror',side:'front'},{id:'route',side:'front'}]));
});
