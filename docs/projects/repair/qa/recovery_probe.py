"""Check interaction geometry and cancellation separately from the regular play-through."""
from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
url=sys.argv[1] if len(sys.argv)>1 else "http://127.0.0.1:18743/?project=repair&qa=1"
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel="chrome",headless=True,args=["--enable-unsafe-swiftshader","--use-angle=swiftshader"])
    pg=browser.new_page(viewport={"width":1280,"height":800})
    pg.goto(url);pg.wait_for_function("window.studioProbe?.targets().length===13")
    def state():return pg.evaluate("studioProbe.state()")
    def coords():
        return {r["name"]:(r["x"],r["y"]) for r in pg.evaluate("studioProbe.targets()")}
    def passed(name,p):
        assert p, name
        results.append(name)
    xy=coords();pg.mouse.click(*xy["tray-mirror"]);pg.keyboard.press("l")
    pg.mouse.move(*xy["tray-mirror"]);pg.mouse.down();pg.mouse.move(*xy["dock-mirror"],steps=6)
    pg.locator("canvas").dispatch_event("pointercancel", {"pointerId":1})
    pg.mouse.up()
    passed("cancelled drag retains selected angle without seating",state()["parts"]["mirror"]=={"angle":30,"mounted":False})
    pg.mouse.click(*xy["dock-mirror"])
    passed("fresh click seats after cancellation",state()["parts"]["mirror"]["mounted"])
    pg.mouse.click(*xy["tray-filter"]);pg.keyboard.press("l");pg.keyboard.press("l")
    bx,by=xy["dock-filter"];scale=(bx-xy["dock-mirror"][0])/.72
    pg.mouse.click(bx+scale*.17,by)
    passed("B plus 17 cm rejected",not state()["parts"]["filter"]["mounted"] and "중심" in state()["note"])
    pg.mouse.click(bx+scale*.14,by)
    passed("B plus 14 cm accepted",state()["parts"]["filter"]["mounted"])
    pg.keyboard.press("3");pg.keyboard.press("j");pg.keyboard.press("f");pg.keyboard.press("c");pg.keyboard.press("o");pg.keyboard.press("r")
    pg.wait_for_timeout(2750)
    passed("reset cancels a pending scan",state()["status"]=="assembly" and sum(state()["bars"])==0)
    for width,height in [(1280,800),(960,720)]:
        pg.set_viewport_size({"width":width,"height":height});pg.wait_for_timeout(200)
        visible=pg.evaluate("studioProbe.targets().every(t=>t.inView && document.elementFromPoint(t.x,t.y)?.tagName==='CANVAS')")
        passed(f"{width} x {height} all 13 centers reachable",visible)
    browser.close()
Path(__file__).with_name("recovery.json").write_text(json.dumps({"desktop":True,"syntheticCancellation":True,"passed":results},indent=2),encoding="utf-8")
print(results)
