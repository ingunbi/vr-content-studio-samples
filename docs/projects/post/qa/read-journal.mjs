import {readFileSync} from 'node:fs';
import {passage,ports} from '../route.mjs';

export function verify(log) {
  if(log.format!=='post-voyage-1'||!Array.isArray(log.arrivals))throw Error('알 수 없는 일지 형식');
  let at='home',time=0,closed=false;
  const letters=new Set();
  for(const [i,row] of log.arrivals.entries()) {
    const fail=why=>{throw Error((i+1)+'행 · '+why);};
    if(closed)fail('귀환 뒤의 기록');
    if(!Object.hasOwn(ports,row.at)||typeof row.wait!=='boolean')fail('지점 또는 대기 표시');
    if(row.wait&&row.at!==at)fail('대기 중 위치 이동');
    const step=row.wait?{ok:true,duration:1}:passage(at,row.at,time);
    if(!step.ok)fail('닫혀 있거나 없는 항로');
    time+=step.duration;at=row.at;
    if(time!==row.minute)fail('도착 분 불일치');
    const fresh=!row.wait&&['bell','east'].includes(at)&&!letters.has(at);
    if(fresh!==row.delivered)fail('중복 또는 누락된 우편');
    if(fresh)letters.add(at);
    closed=letters.size===2&&at==='home';
  }
  if(log.completed!==closed || log.lastPort!==at || log.minute!==time ||
    JSON.stringify(log.delivered)!==JSON.stringify([...letters]))throw Error('일지의 요약과 도착 행이 다릅니다.');
  return {completed:closed,at,minutes:time,letters:[...letters],arrivals:log.arrivals.length};
}
if(process.argv[2])console.log(JSON.stringify(verify(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
