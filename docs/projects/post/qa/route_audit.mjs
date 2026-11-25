// Search over port, tidal phase, and the two delivered letters. Costs are minutes.
import assert from 'node:assert/strict';
import {ports, passage} from '../route.mjs';

export function bestVoyage(departure, allowWait=true, closeShoal=false) {
  const next=[{at:'home',elapsed:0,mask:0,steps:[]}], settled=new Set();
  while(next.length) {
    next.sort((a,b)=>a.elapsed-b.elapsed);
    const state=next.shift(), minute=departure+state.elapsed;
    const key=[state.at,minute%8,state.mask].join('/');
    if(settled.has(key))continue;
    settled.add(key);
    if(state.at==='home' && state.mask===3)return state;
    for(const action of [...Object.keys(ports),...(allowWait?['wait']:[])]) {
      const wait=action==='wait', to=wait?state.at:action;
      if(closeShoal && [state.at,to].sort().join('/')==='bell/east') continue;
      const leg=wait?{ok:true,duration:1}:passage(state.at,to,minute);
      if(!leg.ok)continue;
      const mask=state.mask | (to==='bell'?1:to==='east'?2:0);
      next.push({at:to,elapsed:state.elapsed+leg.duration,mask,steps:[...state.steps,action]});
    }
  }
  throw Error('No complete route');
}
const results=[];
for(let start=0;start<8;start++){
  const withWait=bestVoyage(start),noWait=bestVoyage(start,false),closed=bestVoyage(start,true,true);
  assert.ok(withWait.elapsed<=noWait.elapsed && withWait.elapsed<=closed.elapsed);
  results.push({start,shortest:withWait.elapsed,withoutWait:noWait.elapsed,withoutShoal:closed.elapsed,example:withWait.steps});
}
console.log(JSON.stringify(results,null,2));
