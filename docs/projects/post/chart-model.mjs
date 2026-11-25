import {ports,passage} from './route.mjs';

export function reviewPlan(steps, departure=0) {
  let from='home',minute=departure;
  const delivered=new Set(),rows=[];
  const reject=reason=>({ok:false,reason,rows,from,minute});
  if(!Number.isInteger(departure)||departure<0||departure>7)return reject('출발 위상은 0부터 7까지입니다.');
  if(steps.length>16)return reject('예정은 열여섯 칸까지입니다.');
  for(const to of steps) {
    if(to!=='wait'&&!Object.hasOwn(ports,to))return reject('지도에 없는 기항지입니다.');
    if(to==='wait' && delivered.size===2 && from==='home')return reject('이미 귀환한 항차입니다.');
    if(rows.at(-1)?.complete)return reject('귀환한 뒤의 예정은 별도 항차로 만드세요.');
    const wait=to==='wait',leg=wait?{ok:true,duration:1}:passage(from,to,minute);
    if(!leg.ok)return reject(leg.reason);
    const end=minute+leg.duration,at=wait?from:to;
    const mail=(at==='bell'||at==='east')&&!delivered.has(at);
    if(mail)delivered.add(at);
    rows.push({from,to:at,wait,start:minute,end,mail,complete:delivered.size===2 && at==='home'});
    from=at;minute=end;
  }
  return {ok:true,rows,from,minute,complete:rows.at(-1)?.complete??false};
}

export function decodePlan(input) {
  return input===''?[]:input.split(',');
}
