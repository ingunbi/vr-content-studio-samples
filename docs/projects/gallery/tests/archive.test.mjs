import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createArchive } from '../archive.mjs';

test('opening, incomplete evidence, and repeated field notes',()=>{
  const a=createArchive();
  assert.equal(a.get().mode,'floor');assert.equal(a.act('record'),false);
  a.act('desk');a.act('publish');
  assert.equal(a.get().mode,'desk');assert.match(a.get().message,/밤눈 고리/);
  a.act('study','ring');a.act('record');a.act('record');
  assert.deepEqual(a.get().evidence.ring,['front']);
  a.act('desk');a.act('caption',['ring','side']);a.act('publish');
  assert.match(a.get().message,/옆면/);
});
test('chosen captions require their own supporting side; editing does not consume evidence',()=>{
  const a=createArchive();
  for(const [id,side] of [['ring','front'],['mirror','side'],['route','front']]){
    a.act('study',id);a.act('view',side);a.act('record');a.act('desk');a.act('caption',[id,side]);
  }
  a.act('earlier','route');a.act('earlier','route');a.act('publish');
  const first=a.get().edition;
  assert.deepEqual(first.map(i=>i.id),['route','ring','mirror']);
  assert.equal(a.get().mode,'tour');assert.equal(a.act('previous'),false);
  a.act('next');a.act('previous');assert.equal(a.get().cursor,0);
  a.act('next');a.act('next');a.act('next');
  assert.equal(a.get().mode,'end');
  a.act('desk');a.act('earlier','mirror');a.act('caption',['mirror','front']);a.act('publish');
  assert.equal(a.get().mode,'desk');assert.equal(a.get().editions,1);assert.deepEqual(a.get().edition,first);
  a.act('study','mirror');a.act('record');a.act('desk');a.act('publish');
  assert.deepEqual(a.get().edition,[{id:'route',side:'front'},{id:'mirror',side:'front'},{id:'ring',side:'front'}]);
  assert.equal(a.get().editions,2);
  a.reset();assert.deepEqual(a.get().evidence,{ring:[],mirror:[],route:[]});assert.equal(a.get().edition,null);
});
test('detached snapshots and invalid requests cannot mutate the source of truth',()=>{
  const a=createArchive(),s=a.get();s.order.reverse();s.evidence.ring.push('side');
  assert.deepEqual(a.get().order,['ring','mirror','route']);assert.deepEqual(a.get().evidence.ring,[]);
  assert.equal(a.act('study','missing'),false);a.act('desk');
  assert.equal(a.act('caption',['ring','unknown']),false);assert.equal(a.act('earlier','missing'),false);
});
