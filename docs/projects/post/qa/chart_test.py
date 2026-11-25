"""Exercise the separate timetable, file export, and handoff into the 3-D harbor."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
project=Path(__file__).resolve().parents[1]
addr=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18743').rstrip('/')
with sync_playwright() as pw:
    b=pw.chromium.launch(channel='chrome',args=['--enable-unsafe-swiftshader'])
    p=b.new_page(viewport={'width':1170,'height':1000})
    errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(addr+'/projects/post/chart.html')
    def press(s):p.get_by_role('button',name=s,exact=True).click()
    for s in ['종탑섬','동쪽 등대','흰 부표','본항']:press(s)
    assert p.locator('#rows tr').count()==4 and '귀환' in p.locator('#note').inner_text()
    p.screenshot(path=project/'figures/post-chart.png',full_page=True)
    with p.expect_download() as dl:press('예정표 저장')
    data=json.loads(Path(dl.value.path()).read_text(encoding='utf8'));assert data['minute']==12 and data['complete']
    p.locator('#phase').select_option('1')
    assert p.locator('#rows tr').count()==1 and not p.locator('#play').is_visible()
    p.locator('#phase').select_option('0')
    for s in ['동쪽 등대','흰 부표','본항']:press(s)
    p.locator('#play').click()
    p.goto(p.url+'&qa=1');p.wait_for_function('window.studioProbe')
    assert p.evaluate('studioProbe.state().plan')==data['actions']
    p.locator('#reset').click();assert not p.evaluate('studioProbe.state().plan')
    p.goto(addr+'/?project=post&route=bell,bogus&qa=1');p.wait_for_function('window.studioProbe')
    assert not p.evaluate('studioProbe.state().plan')
    assert not errors,errors
    (project/'qa/chart.json').write_text(json.dumps({'download':data,'initialHandoff':True,'invalidRejected':True,'phaseChangeTrimmed':3,'errors':errors,'browser':b.version},ensure_ascii=False,indent=2),encoding='utf8')
    b.close()
