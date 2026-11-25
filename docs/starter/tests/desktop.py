"""Exercise the four published WebGL pages. Call with the studio server's base URL."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
url=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18743').rstrip('/')
(root/'figures').mkdir(exist_ok=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1360,'height':820},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    def stage(n):
        page.goto(f'{url}/starter/index.html?step={n}&qa=1')
        page.wait_for_function('window.benchProbe?.state()')
    def state(): return page.evaluate('benchProbe.state()')
    def pos(id): return list(page.evaluate('k=>benchProbe.position(k)',id).values())
    def shot(name): page.screenshot(path=str(root/'figures'/f'{name}.png'))
    stage(1)
    assert state()['height']==1.6
    level=pos('ochre');page.get_by_text('눈높이 전환').click()
    low=pos('ochre');assert state()['height']==1.1 and low[1]<level[1]
    shot('bench-height')
    stage(2)
    page.mouse.move(*pos('ochre'));closed=state()['last']
    assert closed['id']=='mask'
    shot('bench-mask')
    page.get_by_text('가림판 전환').click();page.mouse.move(*pos('ochre'));opened=state()['last']
    assert opened['id']=='ochre' and opened['distance']>closed['distance']
    page.set_viewport_size({'width':740,'height':740});page.wait_for_timeout(200)
    page.mouse.move(*pos('jade'));assert state()['last']['id']=='jade'
    page.set_viewport_size({'width':1360,'height':820});stage(3)
    page.mouse.move(*pos('ochre'));page.mouse.down();assert state()['held']==1
    page.mouse.move(*pos('jade'));page.mouse.up();assert state()['count']==0
    page.mouse.click(*pos('jade'));assert state()['count']==1
    page.mouse.move(*pos('ochre'));page.mouse.down()
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    page.mouse.up();assert state()['count']==1 and state()['held']==0
    shot('bench-press')
    stage(4);page.wait_for_function("benchProbe.state().button !== 'VR 연결 확인 중'")
    page.mouse.click(*pos('ochre'));xr=state()
    assert xr['count']==1 and not xr['presenting']
    shot('bench-xr-desktop')
    assert not errors,errors
    record={'browser':browser.version,'viewport':[1360,820],'highCenterCSS':level,'lowCenterCSS':low,
            'shutter':closed,'uncovered':opened,'stage4Desktop':xr,'errors':errors}
    (root/'tests'/'desktop-result.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(record,ensure_ascii=False));browser.close()
