import {ports,lanes,tide} from './route.mjs';
import {reviewPlan,decodePlan} from './chart-model.mjs';

const id=s=>document.getElementById(s), sel=id('phase'), svg=id('map'), note=id('note');
const pos=k=>[380+ports[k].x*106,160+ports[k].z*57];
let phase=0,steps=[];
function shape(tag,attrs,text='') {
  const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
  el.textContent=text;svg.appendChild(el);return el;
}
function render(message=''){
  const result=reviewPlan(steps,phase);svg.replaceChildren();id('rows').replaceChildren();
  for(const [a,b,c,shoal] of lanes){
    const [x1,y1]=pos(a),[x2,y2]=pos(b);
    shape('line',{x1,y1,x2,y2,stroke:shoal?'#b26828':'#71948e','stroke-width':3,'stroke-dasharray':shoal?'5 6':'none'});
    shape('text',{x:(x1+x2)/2,y:(y1+y2)/2-8,fill:'#29494b','text-anchor':'middle'},String(c));
  }
  for(const row of result.rows){
    const tr=document.createElement('tr');
    for(const s of [row.wait?ports[row.from].name+' 대기':ports[row.from].name+' → '+ports[row.to].name,row.start,row.end,row.mail?'우편 배달':'·']){
      const td=document.createElement('td');td.textContent=s;tr.appendChild(td);
    }
    id('rows').appendChild(tr);
    const [x1,y1]=pos(row.from),[x2,y2]=pos(row.to);
    shape('line',{x1,y1,x2,y2,stroke:'#256e5c','stroke-width':5,'stroke-opacity':.7});
  }
  for(const [k,p] of Object.entries(ports)){
    const [x,y]=pos(k);shape('circle',{cx:x,cy:y,r:8,fill:k===result.from?'#a14c21':'#254d49'});
    shape('text',{x,y:y+26,'text-anchor':'middle',fill:'#153e3c','font-size':17},p.name);
  }
  for(const [i,label] of ['만조','만조','만조','만조','간조','간조','간조','간조'].entries()) {
    shape('rect',{x:12+i*54,y:10,width:52,height:24,fill:i===result.minute%8?'#9b5428':i<4?'#37797b':'#58686d'});
    shape('text',{x:38+i*54,y:27,'text-anchor':'middle',fill:'white','font-size':13},i+' '+label);
  }
  note.textContent=message||(result.complete?'두 우편을 전하고 귀환합니다.':ports[result.from].name+' · '+result.minute+'분 · '+(tide(result.minute)==='high'?'만조':'간조'));
  const a=id('play');a.hidden=phase!==0;a.href='../../?project=post&route='+encodeURIComponent(steps.join(','));
}
for(let i=0;i<8;i++)sel.add(new Option(i+'분',String(i)));
sel.onchange=()=>{phase=Number(sel.value);const valid=reviewPlan(steps,phase);const discarded=steps.length-valid.rows.length;steps=steps.slice(0,valid.rows.length);render(discarded?'바뀐 물때에서 통과할 수 없는 구간부터 '+discarded+'칸을 지웠습니다.':'');};
for(const [k,name] of [...Object.entries(ports).map(([k,p])=>[k,p.name]),['wait','1분 대기']]){
  const button=document.createElement('button');button.textContent=name;id('choices').appendChild(button);
  button.onclick=()=>{const next=[...steps,k],r=reviewPlan(next,phase);if(r.ok)steps=next;render(r.reason);};
}
id('undo').onclick=()=>{steps.pop();render();};id('clear').onclick=()=>{steps=[];render();};
id('save').onclick=()=>{const data={departure:phase,actions:steps,...reviewPlan(steps,phase)};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='항해예정표.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
const supplied=decodePlan(new URLSearchParams(location.search).get('route')||'');
if(reviewPlan(supplied,0).ok)steps=supplied;
render();
