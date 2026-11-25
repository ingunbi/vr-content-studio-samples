import { pathToFileURL } from 'node:url';
import { WORKS, SIDES, createArchive } from '../archive.mjs';

export function compileRoute(entries) {
  if(entries.length!==WORKS.length || new Set(entries.map(e=>e.id)).size!==WORKS.length)
    throw new Error('서로 다른 작품 세 개를 순서대로 지정하세요.');
  for(const i of entries)
    if(!WORKS.some(w=>w.id===i.id)||!SIDES.includes(i.side))
      throw new Error('형식은 작품ID:front 또는 작품ID:side입니다.');
  const draft=createArchive();
  for(const {id,side} of entries){
    draft.act('study',id);draft.act('view',side);draft.act('record');draft.act('desk');
    draft.act('caption',[id,side]);
  }
  for(const [slot,entry] of entries.entries()){
    while(draft.get().order.indexOf(entry.id)>slot)draft.act('earlier',entry.id);
  }
  draft.act('publish');
  return draft;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const pieces=process.argv.slice(2).map(v=>{const [id,side]=v.split(':');return {id,side};});
    const s=compileRoute(pieces).get();
    for(const [i,entry] of s.edition.entries()){
      const w=WORKS.find(w=>w.id===entry.id);
      console.log((i+1)+'. '+w.name+' — '+w.captions[entry.side]);
    }
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
