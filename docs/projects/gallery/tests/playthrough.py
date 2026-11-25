"""Drive the published WebGL scene through pointer input. Optional argument is the local server URL."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

here=Path(__file__).resolve().parents[1]
url=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18743').rstrip('/')+'/?project=gallery&qa=1'
shots=here/'figures'
def run():
    with sync_playwright() as pw:
        b=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        page=b.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto(url)
        page.wait_for_function("window.studioProbe?.state()?.mode === 'floor'")
        steps=[]
        sightlines=[]
        page.evaluate("""async () => {
          const T=await import('/vendor/three.module.js'), before=T.Scene.prototype.onAfterRender;
          T.Scene.prototype.onAfterRender=function(r,s,c){
            before?.call(this,r,s,c);
            window.gallerySightline=name=>{
              const face=s.getObjectByName('gallery.'+name);
              if(!face)throw Error(name);
              const meshes=[];s.traverseVisible(o=>{
                if(o.isMesh && o.material?.visible && o.material?.colorWrite!==false &&
                   o.material.opacity!==0)meshes.push(o);
              });
              const w=face.geometry.parameters.width,h=face.geometry.parameters.height;
              const caster=new T.Raycaster(), blocked=[];
              let count=0;
              for(const x of [-.47,-.33,-.16,0,.16,.33,.47])for(const y of [-.46,-.23,0,.23,.46]){
                const p=face.localToWorld(new T.Vector3(w*x,h*y,0)).project(c);
                caster.setFromCamera(new T.Vector2(p.x,p.y),c);
                const front=caster.intersectObjects(meshes,false)[0]?.object;
                if(front!==face)blocked.push([x,y,front?.name || front?.type]);
                count++;
              }
              return {name,count,blocked};
            };
          };
        }""")
        page.wait_for_function('typeof gallerySightline==="function"')
        def clear_card(*names):
            for name in names:
                hit=page.evaluate('name=>gallerySightline(name)',name)
                assert not hit['blocked'],hit
                sightlines.append(hit)
        def state(): return page.evaluate("window.studioProbe.state()")
        def click(target):
            hit=page.evaluate("(id)=>studioProbe.targets().find(t=>t.name===id)",'gallery.'+target)
            assert hit and hit['inView'], (target,hit)
            page.mouse.click(hit['x'],hit['y'])
            page.wait_for_timeout(90)
            s=state();steps.append({'target':target, 'mode':s['mode'],'focus':s['focus'],'view':s['view'],'cursor':s['cursor'],'message':s['message']})
        def photo(name):
            page.mouse.move(20,90);page.wait_for_timeout(3900)
            page.screenshot(path=str(shots/(name+'.png')))
        photo('gallery-opening')
        click('floor.desk');click('desk.publish')
        assert state()['mode']=='desk' and '밤눈 고리' in state()['message']
        click('desk.row0.front');click('desk.publish');assert '앞면' in state()['message']
        click('desk.row0.study');photo('gallery-ring-front');click('study.record');click('study.record')
        assert state()['evidence']['ring']==['front']
        click('study.desk');click('desk.row1.study');click('study.side');photo('gallery-mirror-side');click('study.record');click('study.desk');click('desk.row1.side')
        click('desk.row2.study');clear_card('study.text','study.record','study.desk')
        click('study.record');click('study.desk');click('desk.row2.front')
        click('desk.row2.earlier');click('desk.row1.earlier')
        assert state()['order']==['route','ring','mirror']
        photo('gallery-edit-table')
        click('desk.publish');assert state()['mode']=='tour'
        clear_card('tour.text','tour.next','tour.desk')
        photo('gallery-visitor');click('tour.next');click('tour.previous')
        assert state()['cursor']==0
        click('tour.next');click('tour.next');click('tour.next')
        assert state()['mode']=='end' and state()['editions']==1
        photo('gallery-edition')
        click('end.desk');click('desk.row2.front');click('desk.publish')
        assert state()['mode']=='desk' and '앞면' in state()['message']
        click('desk.row2.study');click('study.record');click('study.desk');click('desk.publish')
        assert state()['editions']==2 and state()['edition'][2]['side']=='front'
        assert not errors,errors
        (here/'tests'/'desktop-result.json').write_text(json.dumps({'browser':b.version,'renderer':'WebGL desktop','steps':steps,'sightlines':sightlines,'published':state()['edition'],'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
        print(len(steps),'pointer actions;',b.version,'; two exhibitions published');b.close()
if __name__=='__main__':run()
