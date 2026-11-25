"""Exercise the book's keyboard paths from an extracted web folder or the Windows ZIP.

Run: python -m pip install playwright
     python cross_keyboard.py [--archive path/to/Windows.zip] [--browser path/to/chrome]
"""
import argparse
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import hashlib
import json
import os
import shutil
import zipfile

from playwright.sync_api import sync_playwright


class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextmanager
def serve(root):
    if not (root / "studio.mjs").is_file():
        raise FileNotFoundError(f"No studio.mjs in {root}")
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(SilentHandler, directory=str(root))) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}/"
        finally:
            server.shutdown()
            thread.join()


@contextmanager
def web_folder(archive, source):
    if not archive:
        yield source
        return
    with TemporaryDirectory() as temporary, zipfile.ZipFile(archive) as package:
        root = Path(temporary).resolve()
        for item in package.infolist():
            if not item.filename.startswith("web/") or item.is_dir():
                continue
            dest = (root / item.filename).resolve()
            if not dest.is_relative_to(root / "web"):
                raise ValueError(f"Unexpected web member {item.filename}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            with package.open(item) as incoming, dest.open("wb") as outgoing:
                shutil.copyfileobj(incoming, outgoing)
        yield root / "web"


def run(web, browser_path):
    checks = []
    errors = []
    def expect(name, result):
        if not result:
            raise AssertionError(name)
        checks.append(name)
    with serve(web) as address, sync_playwright() as driver:
        browser = driver.chromium.launch(executable_path=browser_path,
                    args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        page = browser.new_page(viewport={"width":1440,"height":900}, device_scale_factor=1)
        page.on("pageerror", lambda error: errors.append(str(error)))
        def keys(*sequence):
            for key in sequence:
                page.keyboard.press(key)
        def state():
            return page.evaluate("studioProbe.state()")
        def enter(name):
            page.goto(f"{address}?project={name}&qa=1")
            page.wait_for_function("!!window.studioProbe", timeout=45000)
            keys("Tab")
            expect(f"{name} first Tab focuses canvas", page.evaluate("document.activeElement.tagName") == "CANVAS")

        enter("repair")
        keys("1", "f")
        expect("wrong repair orientation rejected", not state()["parts"]["mirror"]["mounted"] and "30°" in state()["note"])
        keys("l","f","2","l","l","f","3","j","f","c","o")
        page.wait_for_function("studioProbe.state().status==='measured'", timeout=20000)
        measured = state()
        expect("all three parts mounted with keyboard", all(v["mounted"] for v in measured["parts"].values()))
        expect("reference peak is 510 nm", measured["peak"] == 510)
        keys("r")
        expect("R resets station", state()["status"] == "assembly" and all(not v["mounted"] for v in state()["parts"].values()))

        enter("sound")
        keys("2","5","k","n","u","Space")
        page.wait_for_function("studioProbe.state().playing&&studioProbe.state().muted")
        expect("act two bell level four on right", state()["score"][1][1] == {"level":4,"side":2})
        expect("silent performance started by keyboard", state()["muted"] and state()["playing"])
        keys("Space")
        expect("Space stops performance and preserves edit", not state()["playing"] and state()["score"][1][1]["level"]==4)

        enter("gallery")
        expect("gallery enters at floor", state()["mode"]=="floor")
        keys("Enter")
        expect("Enter opens centre artwork", state()["mode"]=="study" and state()["focus"] is not None)

        page.goto(address+"projects/post/chart.html")
        page.wait_for_selector("#choices button")
        keys("Tab","Tab")
        expect("Tab reaches tide selector", page.evaluate("document.activeElement.id")=="phase")
        keys("ArrowDown")
        expect("keyboard changes departure to phase one", page.locator("#phase").input_value()=="1")
        keys("ArrowUp")
        expect("departure restored to zero", page.locator("#phase").input_value()=="0")
        for _ in range(12):
            keys("Tab")
            if page.evaluate("document.activeElement.textContent==='1분 대기'"):
                break
        expect("Tab reaches wait button", page.evaluate("document.activeElement.textContent")== "1분 대기")
        keys("Enter")
        expect("one wait adds one row", page.locator("#rows tr").count()==1 and "대기" in page.locator("#rows").inner_text())
        keys("Tab","Enter")
        expect("undo removes wait using keyboard",page.locator("#rows tr").count()==0)
        expect("no uncaught page error",not errors)
        result={"browser":browser.version,"viewport":[1440,900],"checks":checks,
                "navigation":"Playwright keyboard.press and read-only DOM or studioProbe.state",
                "excluded":["Unreal desktop","immersive headset","assistive technology","observation by human participants"]}
        browser.close()
    return result


def main():
    script = Path(__file__).resolve()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--web-root", type=Path, default=script.parents[3])
    parser.add_argument("--browser", default=os.environ.get("SOUND_CHROME",r"C:\Program Files\Google\Chrome\Application\chrome.exe"))
    parser.add_argument("--output", type=Path, default=script.with_name("cross-keyboard.json"))
    args = parser.parse_args()
    with web_folder(args.archive,args.web_root) as root:
        result = run(root,args.browser)
        paths=["studio.mjs","projects/repair/scene.mjs","projects/repair/model.mjs","projects/sound/scene.mjs",
               "projects/gallery/scene.mjs","projects/post/chart.html","projects/post/chart.mjs"]
        result["web_sha256"]={key:hashlib.sha256((root/key).read_bytes()).hexdigest() for key in paths}
    result["source"]="ZIP web entries" if args.archive else "web directory"
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"{len(result['checks'])} keyboard checks passed in {result['browser']}")


if __name__=="__main__":
    main()
