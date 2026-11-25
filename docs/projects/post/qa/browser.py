from pathlib import Path
import json, sys
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]; path=root/'figures';path.mkdir(exist_ok=True)
address=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18743').rstrip('/')
with sync_playwright() as pw:
    b=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
    errors=[];states=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(address+'/?project=post&qa=1');page.wait_for_function('window.studioProbe')
    def state():return page.evaluate('studioProbe.state()')
    def press(name):
        item=page.evaluate('(n)=>studioProbe.targets().find(t=>t.name==="post."+n)',name)
        assert item and item['inView'],(name,item)
        page.mouse.click(item['x'],item['y']);page.wait_for_timeout(80);states.append({'action':name,'state':state()})
    def photo(label):
        page.mouse.move(3,110);page.wait_for_timeout(220);page.screenshot(path=path/('post-'+label+'.png'))
    photo('harbor');press('east');assert not state()['plan']
    for n in ['buoy','east','bell']:press(n)
    assert '간조' in state()['message'];photo('ebb')
    press('wait');press('wait');press('bell');press('home');photo('route')
    press('go');page.wait_for_function("studioProbe.state().delivered.includes('east')",timeout=90000);photo('sail')
    page.wait_for_function("studioProbe.state().mode==='done'",timeout=90000)
    s=state();assert s['delivered']==['east','bell'] and s['time']==14;photo('receipt')
    with page.expect_download() as download:page.get_by_role('button',name='일지 저장').click()
    journal=json.loads(Path(download.value.path()).read_text(encoding='utf8'))
    assert journal['completed'] and journal['arrivals']==s['log'] and journal['minute']==14
    (root/'qa/항해일지_14분.json').write_text(json.dumps(journal,ensure_ascii=False,indent=2),encoding='utf8')
    press('again');assert state()['log']==[]
    press('bell');press('east');press('undo');assert state()['plan']==['bell']
    assert not errors,errors
    (root/'qa/desktop.json').write_text(json.dumps({'browser':b.version,'input':'mouse pointer; rendered WebGL','states':states,'finished':s,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    b.close()
