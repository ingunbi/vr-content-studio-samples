import test from 'node:test';
import assert from 'node:assert/strict';
import {latch} from '../03-press.mjs';

test('같은 표식과 같은 입력원에서 한 번만 확정한다',()=>{
  const seen=[],g=latch(id=>seen.push(id)),left={},right={};
  g.down(left,'ochre');assert.equal(g.up(right,'ochre'),false);
  g.down(left,'jade');assert.equal(g.up(left,'ochre'),true);
  assert.equal(g.up(left,'ochre'),false);
  g.down(right,'ochre');assert.equal(g.up(right,'jade'),false);
  assert.deepEqual(seen,['ochre']);
});
test('추적을 잃은 입력원은 새 누름 뒤에 다시 선택할 수 있다',()=>{
  const seen=[],g=latch(id=>seen.push(id)),source={};
  g.down(source,'jade');g.cancel(source);
  assert.equal(g.up(source,'jade'),false);
  g.down(source,'jade');assert.equal(g.up(source,'jade'),true);
  g.down(source,'ochre');g.clear();assert.equal(g.size(),0);
  assert.deepEqual(seen,['jade']);
});
