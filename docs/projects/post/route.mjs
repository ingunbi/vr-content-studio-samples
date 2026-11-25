// Coordinates are metres on the chart. A voyage advances in simulated minutes.
export const ports = {
  home: {name:'본항', x:-2.45,z:1.03},
  bell: {name:'종탑섬',x:-2.18,z:-1.75},
  buoy: {name:'흰 부표',x:-.15,z:.18},
  east: {name:'동쪽 등대',x:2.34,z:-1.55},
  inlet: {name:'남쪽 포구',x:2.24,z:1.20},
};
export const lanes = [
  ['home','bell',3],['home','buoy',2],['bell','buoy',2],['bell','east',3,'shoal'],
  ['buoy','east',4],['buoy','inlet',3],['east','inlet',2]
];
export function tide(minute){return minute%8<4?'high':'low';}
export function passage(from,to,minute){
  const edge=lanes.find(([a,b])=>a===from&&b===to||a===to&&b===from);
  if(!edge)return {ok:false,reason:'지도에서 선으로 이어진 이웃 지점을 고르세요.'};
  if(edge[3]==='shoal' && tide(minute)!=='high')return {ok:false,reason:'간조입니다. 흰 부표로 돌아가거나 한 분 기다리세요.'};
  return {ok:true,duration:edge[2]};
}
export function createRoute(){
  let state;
  function reset(){state={at:'home',plan:[],time:0,mode:'plan',leg:null,delivered:[],log:[],message:'종탑섬과 동쪽 등대에 편지를 전하고 본항으로 돌아오세요.'};}
  reset();
  function forecast(){
    let from=state.at,at=state.time;
    return state.plan.map(to=>{
      if(to==='wait'){at++;return {to,minute:at,ok:true,duration:1};}
      const leg=passage(from,to,at);
      if(leg.ok){at+=leg.duration;from=to;}
      return {to,minute:at,...leg};
    });
  }
  function append(to){
    if(state.mode!=='plan')return;
    if(state.plan.length>=16){state.message='한 번에 열여섯 칸까지 계획할 수 있습니다.';return;}
    const predicted=forecast(),last=state.plan.filter(x=>x!=='wait').at(-1)||state.at;
    const at=predicted.at(-1)?.minute??state.time;
    const check=to==='wait'?{ok:true}:passage(last,to,at);
    if(!check.ok){state.message=check.reason;return;}
    state.plan.push(to);
    state.message=to==='wait'?'예정표에 1분 대기를 넣었습니다.':ports[to].name+' 기항을 예정표에 넣었습니다.';
  }
  function undo(){if(state.mode==='plan'){state.plan.pop();state.message='마지막 예정 한 칸을 되돌렸습니다.';}}
  function nextLeg(){
    const to=state.plan.shift();
    if(!to){state.mode='plan';state.message='정박했습니다. 다음 구간을 계획하세요.';return;}
    const wait=to==='wait',check=wait?{ok:true,duration:1}:passage(state.at,to,state.time);
    if(!check.ok){state.mode='plan';state.plan=[];state.message=check.reason;return;}
    state.leg={from:state.at,to:wait?state.at:to,wait,duration:check.duration,elapsed:0};
    state.mode='sail';state.message=wait?'정박 중 · 다음 물때를 기다립니다.':'운항 중 · '+ports[to].name;
  }
  function launch(){if(state.mode==='plan' && state.plan.length)nextLeg();}
  function stop(){if(state.mode==='sail'){state.plan=[];state.message='지금 구간을 마친 뒤 정박합니다.';}}
  function advance(dt){
    if(state.mode!=='sail' || !Number.isFinite(dt) || dt<=0)return;
    while(dt>1e-8 && state.leg){
      const l=state.leg,spent=Math.min(l.duration-l.elapsed,dt);
      l.elapsed+=spent;dt-=spent;
      if(l.elapsed+1e-8<l.duration)return;
      state.time+=l.duration;state.at=l.to;state.leg=null;
      const delivered=!l.wait && ['bell','east'].includes(l.to) && !state.delivered.includes(l.to);
      if(delivered)state.delivered.push(l.to);
      state.log.push({at:l.to,minute:state.time,wait:l.wait,delivered});
      if(l.to==='home' && state.delivered.length===2){
        state.plan=[];state.mode='done';state.message='배달 완료 · 본항 귀환 · '+state.time+'분 운항';return;
      }
      nextLeg();
    }
  }
  function position(){
    if(!state.leg)return {...ports[state.at],angle:0};
    const l=state.leg,a=ports[l.from],b=ports[l.to],f=l.elapsed/l.duration;
    return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,angle:Math.atan2(b.x-a.x,b.z-a.z)};
  }
  return {reset,append,undo,launch,stop,advance,position,forecast,read:()=>state,getState:()=>structuredClone(state)};
}
