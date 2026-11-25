"""Check a widescreen and a portrait desktop viewport with actual keyboard and mouse input."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
url=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18743').rstrip('/')+'/?project=gallery&qa=1'
def run():
    rows=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
        for w,h in [(1280,800),(600,900)]:
            page=browser.new_page(viewport={'width':w,'height':h});page.goto(url)
            page.wait_for_function("window.studioProbe?.state()?.mode==='floor'")
            def target(key):return page.evaluate('name=>studioProbe.targets().find(t=>t.name===name)',key)
            initially=target('gallery.open.ring')['inView']
            turns=0
            while not target('gallery.open.ring')['inView'] and turns<12:
                page.keyboard.press('ArrowLeft');page.wait_for_timeout(70);turns+=1
            panel=target('gallery.open.ring')
            assert panel['inView']
            page.mouse.click(panel['x'], panel['y'])
            page.wait_for_function("studioProbe.state().focus==='ring'")
            rows.append({'viewport':[w,h],'ringInitiallyInView':initially,'leftTurns':turns,'opened':'ring'})
            page.close()
        browser.close()
    print(rows)
    (Path(__file__).parent/'viewport-result.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
if __name__=='__main__':run()
