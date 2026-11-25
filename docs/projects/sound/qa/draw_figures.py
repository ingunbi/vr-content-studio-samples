"""Draw reader figures from the shipped synth, cue coordinates and boot score."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
import math
import os

project=Path(__file__).resolve().parents[1]
dest=project/'figures'
dest.mkdir(exist_ok=True)
font_path='C:/Windows/Fonts/malgun.ttf'
bold_path='C:/Windows/Fonts/malgunbd.ttf'
ink='#18364a'; muted='#506470'; grid='#cfdbdc'
colors=['#09777b','#a25e07','#a5433c']
def text(draw,xy,value,size,fill=ink,bold=False,anchor='la'):
    draw.text(xy,value,font=ImageFont.truetype(bold_path if bold else font_path,size),fill=fill,anchor=anchor)
def sheet(title,caption):
    im=Image.new('RGB',(1280,780),'#f7f8f6'); d=ImageDraw.Draw(im)
    text(d,(67,43),title,44,bold=True);text(d,(70,115),caption,24,muted)
    return im,d
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(project.parents[1])))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=os.environ.get('SOUND_CHROME',r'C:\Program Files\Google\Chrome\Application\chrome.exe'))
    page=b.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/projects/sound/score.mjs')
    data=page.evaluate("""async()=>{
      const {makeBuffer}=await import('./audio.mjs'),S=await import('./score.mjs');
      const c=new OfflineAudioContext(2,128000,32000);
      const traces=[0,1,2].map(s=>{const a=makeBuffer(c,s).getChannelData(0);
        return Array.from({length:400},(_,i)=>{const v=a.subarray(i*320,(i+1)*320);
          return Math.sqrt(v.reduce((sum,x)=>sum+x*x,0)/v.length);
        });});
      return {traces,row:S.openingScore(),x:S.X,z:S.Z};
    }""")
    b.close()
server.shutdown()

im,d=sheet('서로 다른 세 음원의 시간 윤곽','실제 모노 버퍼의 10ms 구간 RMS · 공통 세로축 0~0.30 · 32,000Hz 렌더')
for i,(name,series,col) in enumerate(zip(['지붕 비','승강장 종','막차 저음'],data['traces'],colors)):
    base=315+i*182; x0,x1=215,1195; span=125
    text(d,(65,base-90),name,29,col,True)
    for j in range(5):
        x=x0+(x1-x0)*j/4
        d.line((x,base-span,x,base),fill=grid,width=2)
        if i==2:text(d,(x,base+13),f'{j}초',22,muted,anchor='ma')
    d.line((x0,base,x1,base),fill=ink,width=2)
    points=[(x0+(x1-x0)*j/399,base-span*v/.30) for j,v in enumerate(series)]
    d.polygon([(x0,base),*points,(x1,base)],fill=col)
im.save(dest/'02-waveforms.png')

im,d=sheet('객석 정면에서 본 음원의 평면 배치','소리의 좌표는 월드에 고정된다. 점선은 처음 정면을 향한 청취자의 오른쪽과 왼쪽이다.')
x0=670; xx=lambda x:x0+x*110; yy=lambda z:253+(z+3.5)*51
for s,(name,col) in enumerate(zip(['지붕 비','승강장 종','막차 저음'],colors)):
    y=yy(data['z'][s])
    for side,x in enumerate(data['x']):
        dx=xx(x)
        d.ellipse((dx-7,y-7,dx+7,y+7),fill=col)
    d.line((xx(-2.6),y,xx(2.6),y),fill=col,width=2)
    text(d,(1000,y-10),name,20,col)
for x,name in zip(data['x'],['왼쪽','가운데','오른쪽']):
    text(d,(xx(x),192),f'{name}   x={x:g}m',23,ink,True,'ma')
py=yy(4)
for x in [-2.6,2.6]:
    end=(xx(x),yy(-2.5))
    for j in range(0,22,2):
        pts=[]
        for t in [j/22,(j+1)/22]:
            pts.append((x0+(end[0]-x0)*t,py+(end[1]-py)*t))
        d.line(pts,fill=muted,width=2)
d.polygon([(x0,py-18),(x0-15,py+13),(x0+15,py+13)],fill=ink)
text(d,(x0,py+37),'객석  x=0, z=4m',25,ink,True,'ma')
text(d,(64,709),'위에서 본 도식 · 각 음원의 높이는 비 2.60m, 종 1.95m, 막차 1.05m',24,muted)
im.save(dest/'05-field.png')

im,d=sheet('한 공연, 두 개의 시계','샘플의 시작은 음향 시계에 예약한다. 전광판은 매 프레임 현재 시간을 읽어 막을 표시한다.')
xp=lambda t:240+78*t
for q,title in enumerate(['도착 전','문 열림','출발 뒤']):
    text(d,(xp(q*4+2),184),title,29,bold=True,anchor='ma')
    for s,col in enumerate(colors):
        y=312+s*90
        cell=data['row'][q][s];n=cell['level']
        if n:d.rounded_rectangle((xp(q*4)+3,y,xp((q+1)*4)-4,y+47),radius=6,fill=col)
        else:d.rectangle((xp(q*4)+3,y,xp((q+1)*4)-4,y+47),outline=grid,width=2)
        text(d,(xp(q*4+2),y+7),f'{n}단계' if n else '쉼',23,'white' if n else muted,anchor='ma')
for n,stem in enumerate(['지붕 비','승강장 종','막차 저음']):text(d,(65,315+n*90),stem,28,colors[n],True)
for t in [0,4,8,12]:
    x=xp(t);d.line((x,240,x,570),fill=grid,width=2);text(d,(x,576),f'{t}초',23,muted,anchor='ma')
text(d,(65,667),'음향 예약 7개',29,bold=True)
text(d,(359,673),'0초에 둘, 4초에 셋, 8초에 둘이 시작한다.',25)
im.save(dest/'06-timeline.png')
