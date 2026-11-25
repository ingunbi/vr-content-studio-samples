"""Desktop render counters of four live exhibits; all instrumentation lives in the test page."""
import json
from pathlib import Path
import sys
from PIL import Image,ImageDraw
from platefont import font as plate_font
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
(root/'figures').mkdir(exist_ok=True)
url=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18743').rstrip('/')
work_names={'gallery':'달의 기록관','repair':'궤도 정비소','sound':'비 오는 밤의 소리극장','post':'해협 우편선'}
hook="""async () => {
  const {Scene,Vector2}=await import('/vendor/three.module.js');
  const probe={records:[],panels:[],renderer:null,scene:null};
  const old=Scene.prototype.onAfterRender;
  Scene.prototype.onAfterRender=function(renderer,...rest){
    old?.call(this,renderer,...rest);
    if(!this.children.some(x=>x.isGroup))return;
    probe.renderer=renderer;probe.scene=this;probe.camera=rest[1];
    const size=renderer.getDrawingBufferSize(new Vector2()),i=renderer.info;
    probe.records.push({calls:i.render.calls,triangles:i.render.triangles,lines:i.render.lines,
      textures:i.memory.textures,geometries:i.memory.geometries,w:size.x,h:size.y});
    if(probe.records.length>40)probe.records.shift();
  };
  probe.clear=()=>{probe.records=[];};
  probe.dpr=value=>{probe.renderer.setPixelRatio(value);probe.clear();};
  probe.fov=value=>{probe.camera.fov=value;probe.camera.updateProjectionMatrix();probe.clear();};
  probe.hidePanels=()=>{
    probe.scene.traverseVisible(o=>{
      if(o.isMesh && o.geometry?.type==='PlaneGeometry' && o.material?.map?.isCanvasTexture)
        probe.panels.push(o);
    });
    for(const o of probe.panels)o.visible=false;
    probe.clear();return probe.panels.length;
  };
  probe.restore=()=>{for(const o of probe.panels)o.visible=true;probe.panels=[];probe.clear();};
  window.renderMeter=probe;
}"""
records={}
sheet=Image.new('RGB',(1500,1020),'#eff1e9');draw=ImageDraw.Draw(sheet)
font=plate_font(30,True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
    for n,(project,title) in enumerate(work_names.items()):
        page.goto(url+'/?project='+project+'&qa=1')
        page.wait_for_function('window.studioProbe?.state()')
        page.evaluate(hook)
        def sample():
            page.wait_for_function('renderMeter.records.length>=8',timeout=60000)
            return page.evaluate('renderMeter.records.slice(-8)')
        base=sample()
        rect=page.locator('#stage canvas').bounding_box()
        frame=page.locator('#stage canvas').screenshot()
        import io
        thumb=Image.open(io.BytesIO(frame)).convert('RGB')
        thumb.thumbnail((714,420))
        x=28+n%2*752;y=28+n//2*501
        sheet.paste(thumb,(x,y))
        draw.text((x,y+428),f'{title}   |   {base[-1]["calls"]}회',font=font,fill='#203c42')
        page.evaluate('renderMeter.dpr(.75)');reduced=sample()
        page.evaluate('renderMeter.dpr(1)');sample()
        panels=page.evaluate('renderMeter.hidePanels()');hidden=sample()
        page.evaluate('renderMeter.restore()');restored=sample()
        assert restored[-1]['calls']==base[-1]['calls'],(project,restored[-1],base[-1])
        assert reduced[-1]['w']<base[-1]['w'] and reduced[-1]['h']<base[-1]['h']
        page.evaluate('renderMeter.fov(39)');narrow=sample()
        page.evaluate('renderMeter.fov(57)');sample()
        records[project]={'base':base,'reducedDPR':reduced,'hiddenPanels':hidden,'panels':panels,'restored':restored,'narrowFOV':narrow,'css':rect}
    result={'browser':browser.version,'viewport':[1280,800],'framesPerSample':8,'works':records}
    (root/'tests'/'profile-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    sheet.save(root/'figures'/'bench-four-frames.png')
    chart=Image.new('RGB',(1500,930),'#f6f5ee');d=ImageDraw.Draw(chart)
    head=plate_font(46,True)
    note=plate_font(25)
    d.text((52,40),'같은 입구에서 조건 하나만 바꾼 드로 콜',font=head,fill='#253f44')
    colors=['#315e63','#ba824c','#678b99']
    for j,t in enumerate(['기본 57°','캔버스 판 숨김','시야각 39°']):
        x=65+j*345;d.rectangle((x,147,x+34,172),fill=colors[j]);d.text((x+46,133),t,font=font,fill='#203c42')
    for n,(project,title) in enumerate(work_names.items()):
        v=records[project];y=238+n*157
        d.text((55,y+31),title,font=font,fill='#203c42')
        for j,key in enumerate(['base','hiddenPanels','narrowFOV']):
            count=v[key][-1]['calls'];x=410;top=y+37*j
            d.rectangle((x,top,x+count*2.15,top+24),fill=colors[j])
            d.text((x+count*2.15+10,top-10),str(count),font=note,fill='#203c42')
    d.text((55,872),'1,280 × 800 데스크톱 · 조건별 연속 8프레임 중 마지막 값 · 단위는 프레임당 렌더 호출 수',font=note,fill='#203c42')
    chart.save(root/'figures'/'bench-draw-calls.png')
    for project,v in records.items():
        print(project,v['panels'],v['base'][-1],v['reducedDPR'][-1],v['hiddenPanels'][-1],v['narrowFOV'][-1])
    browser.close()
