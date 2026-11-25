"""Play the shipped scene and render its opening score in a real browser audio graph."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
import base64
from array import array
import json
import os
import wave
from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]
book = project.parents[1]
figures = project / "figures"
figures.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(book)))
Thread(target=server.serve_forever, daemon=True).start()
checks = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get("SOUND_CHROME",r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
                                 args=["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    page = browser.new_page(viewport={"width":1440,"height":900},device_scale_factor=1)
    errors = []
    page.on("pageerror",lambda exc: errors.append(str(exc)))
    base_url=os.environ.get("SOUND_QA_URL",f"http://127.0.0.1:{server.server_port}").rstrip("/")
    page.goto(base_url+"/?project=sound&qa=1")
    page.wait_for_function("!!window.studioProbe", timeout=45000)
    state = lambda: page.evaluate("studioProbe.state()")
    def hit(name):
        obj=page.evaluate("(n)=>studioProbe.targets().find(t=>t.name==='sound-'+n)",name)
        assert obj and obj['inView'],name
        page.mouse.click(obj['x'],obj['y'])
    def expect(name,predicate):
        assert predicate, name
        checks.append(name)
    page.screenshot(path=str(figures/"01-arrival.png"))
    expect("opening score",state()["score"][1][1] == {"level":3,"side":1})
    hit("cue-1");hit("stem-1");hit("level-up");hit("side")
    expect("edit one cell and leave neighbours",state()["score"][1][1] == {"level":4,"side":2} and state()["score"][0][1]["level"]==0)
    page.screenshot(path=str(figures/"03-edit.png"))
    hit("preview");page.wait_for_function("studioProbe.state().playing&&studioProbe.state().preview")
    hit("level-down");expect("preview locks score",state()["score"][1][1]["level"]==4)
    hit("stop");expect("manual stop",not state()["playing"])
    hit("play");page.wait_for_function("studioProbe.state().activeCue===1",timeout=10000)
    page.screenshot(path=str(figures/"04-onstage.png"))
    hit("mute");expect("mute while running",state()["muted"] and state()["playing"])
    page.wait_for_function("studioProbe.state().completed&&!studioProbe.state().playing",timeout=15000)
    expect("completed after three cues",state()["completed"])
    hit("play");page.wait_for_function("studioProbe.state().playing")
    hit("mute");expect("silent run returns to editing when sound requested",not state()["playing"] and not state()["muted"])
    page.locator("#reset").click();expect("reset restores score",state()["cue"]==0 and state()["score"][1][1]["level"]==3)
    audio=page.evaluate("""async()=>{
      const {openingScore,planScore}=await import('./projects/sound/score.mjs');
      const {makeBuffer,schedule,poseListener}=await import('./projects/sound/audio.mjs');
      async function render(score,preview,stem,muted=false){
        const plan=planScore(score,0,stem,preview), c=new OfflineAudioContext(2,plan.duration*32000,32000);
        const a=[0,1,2].map(i=>makeBuffer(c,i));
        poseListener(c,{x:0,y:1.6,z:4},{x:0,y:0,z:-1},{x:0,y:1,z:0});
        schedule(c,a,plan,0,muted);
        const b=await c.startRendering();
        const l=b.getChannelData(0),r=b.getChannelData(1);
        const rms=v=>Math.sqrt(v.reduce((s,x)=>s+x*x,0)/v.length);
        const bytes=new Uint8Array(4*b.length),dv=new DataView(bytes.buffer);
        let peak=0;
        for(let i=0;i<b.length;i++){
          peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));
          if(!preview)for(const [j,v] of [[0,l[i]],[2,r[i]]])dv.setInt16(4*i+j,Math.round(v*32767),true);
        }
        let wav='';if(!preview)for(let i=0;i<bytes.length;i+=32768)wav+=String.fromCharCode(...bytes.subarray(i,i+32768));
        const windows=Array.from({length:plan.duration/4},(_,i)=>
          [rms(l.subarray(i*128000,(i+1)*128000)),rms(r.subarray(i*128000,(i+1)*128000))]);
        return {rms:[rms(l),rms(r)],windows,peak,pcm:wav?btoa(wav):'',events:plan.events.length};
      }
      const score=openingScore(),whole=await render(score,false,0);
      const left=await render(score,true,0);
      score[0][0].side=2;const right=await render(score,true,0),silent=await render(score,true,0,true);
      const alternate=openingScore();
      alternate[2][0].level=4;alternate[2][2]={level:1,side:2};
      const curtain=await render(alternate,false,0);
      return {whole,left,right,silent,curtain};
    }""")
    pcm=base64.b64decode(audio["whole"].pop("pcm"))
    alternate_pcm=base64.b64decode(audio["curtain"].pop("pcm"))
    for value in audio.values(): value.pop("pcm",None)
    with wave.open(str(project/"opening-score.wav"),"wb") as file:
        file.setparams((2,2,32000,0,'NONE','not compressed'));file.writeframes(pcm)
    with wave.open(str(project/"curtain-of-rain.wav"),"wb") as file:
        file.setparams((2,2,32000,0,'NONE','not compressed'));file.writeframes(alternate_pcm)
    expect("stereo 12 seconds",len(pcm)==12*32000*4 and audio["whole"]["peak"]<1)
    expect("rain changes stereo energy",audio["left"]["rms"][0]>audio["left"]["rms"][1] and audio["right"]["rms"][0]<audio["right"]["rms"][1])
    expect("muted output",audio["silent"]["peak"]==0)
    frames=32000*8*2
    samples_a,samples_b=array('h',pcm),array('h',alternate_pcm)
    residual=[abs(x-y) for x,y in zip(samples_a,samples_b)]
    comparison={"first_8s_max_lsb":max(residual[:frames]),"first_8s_changed_samples":sum(d!=0 for d in residual[:frames]),
                "last_4s_max_lsb":max(residual[frames:]),"last_4s_changed_samples":sum(d!=0 for d in residual[frames:])}
    expect("alternate mix preserves acts one and two within one PCM step",comparison["first_8s_max_lsb"]<=1)
    expect("alternate mix changes act three",comparison["last_4s_max_lsb"]>100)
    expect("page errors",not errors)
    data={"browser":browser.version,"checks":checks,"audio":audio,"comparison":comparison,
          "headset":"미실행","physical_listening":"청취자 방향 판별·착용 시험 미실행",
          "measurement":"OfflineAudioContext, 32000 Hz, listener (0,1.6,4), opening score"}
    (project/"qa"/"result.json").write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(data,ensure_ascii=False,indent=2))
    browser.close()
server.shutdown()
