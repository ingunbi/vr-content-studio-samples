"""Desktop input test. Three.js keeps its normal rendering and pointer event handling."""
from pathlib import Path
import argparse, json
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument("url",nargs="?",default="http://127.0.0.1:18743/?project=repair&qa=1")
args=parser.parse_args()
directory=Path(__file__).resolve().parents[1]
figures=directory/"figures"
figures.mkdir(exist_ok=True)
records=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel="chrome",headless=True,args=["--enable-unsafe-swiftshader","--use-angle=swiftshader"])
    page=browser.new_page(viewport={"width":1440,"height":900},device_scale_factor=1)
    errors=[]
    page.on("pageerror",lambda x:errors.append(str(x)))
    page.goto(args.url)
    page.wait_for_function("window.studioProbe && window.studioProbe.targets().length===13")
    targets={r["name"]:r for r in page.evaluate("window.studioProbe.targets()")}
    assert all(r["inView"] for r in targets.values()),targets
    def xy(name):
        r=targets[name]; return r["x"],r["y"]
    def click(name):page.mouse.click(*xy(name))
    def read():return page.evaluate("window.studioProbe.state()")
    def check(name, predicate):
        s=read();assert predicate(s),(name,s);records.append({"step":name,"state":s})
    def shot(name):
        page.mouse.move(1420,850)
        page.wait_for_timeout(100)
        page.screenshot(path=str(figures/(name+".png")))
    def drag(a,b):
        page.mouse.move(*xy(a));page.mouse.down();page.mouse.move(*xy(b),steps=12);page.mouse.up()
    check("new",lambda s:s["selected"] is None and s["status"]=="assembly")
    shot("repair-deck")
    click("cmd-scan");check("missing",lambda s:"광로" in s["note"] and s["status"]=="assembly")
    click("tray-mirror");click("dock-filter")
    check("wrong part",lambda s:"A 소켓" in s["note"] and not s["parts"]["mirror"]["mounted"])
    drag("tray-mirror","dock-mirror")
    check("wrong orientation",lambda s:"30°" in s["note"] and not s["parts"]["mirror"]["mounted"])
    click("cmd-plus");drag("tray-mirror","dock-mirror")
    check("drag installed",lambda s:s["parts"]["mirror"]["mounted"])
    click("tray-filter");click("cmd-plus");click("cmd-plus");click("dock-filter")
    check("two clicks installed",lambda s:s["parts"]["filter"]["mounted"])
    page.keyboard.press("3");page.keyboard.press("j");page.keyboard.press("f")
    check("keyboard installed",lambda s:s["status"]=="ready" and s["parts"]["sensor"]["angle"]==330)
    click("cmd-dark");click("cmd-scan");check("scanning",lambda s:s["status"]=="scanning")
    page.wait_for_function("window.studioProbe.state().status==='measured'",timeout=90000)
    check("short peak",lambda s:s["peak"]==510 and s["saturated"]==0 and s["bars"][18]==81)
    shot("repair-spectrum")
    click("cmd-exposure");check("old baseline cleared",lambda s:s["dark"] is None and s["gain"]==4)
    click("cmd-dark");click("cmd-scan")
    page.wait_for_function("window.studioProbe.state().status==='clipped'",timeout=90000)
    check("long clipped",lambda s:s["peak"] is None and s["saturated"]==3)
    shot("repair-clipped")
    click("dock-filter");click("cmd-eject")
    check("remove filter",lambda s:not s["parts"]["filter"]["mounted"] and s["dark"] is None and s["status"]=="assembly")
    click("cmd-reset");check("reset",lambda s:s["selected"] is None and s["gain"]==1 and all(not p["mounted"] for p in s["parts"].values()))
    assert not errors,errors
    print(json.dumps({"browser":browser.version,"checks":len(records),"errors":errors},ensure_ascii=False))
    (directory/"qa"/"desktop.json").write_text(json.dumps({"browser":browser.version,"resolution":[1440,900],"device":"desktop mouse and keyboard","checks":records,"errors":errors},ensure_ascii=False,indent=2),encoding="utf-8")
    browser.close()
