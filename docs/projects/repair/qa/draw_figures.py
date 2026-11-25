"""Illustrations used in the repair chapters, with the shipped bench dimensions."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

DEST=Path(__file__).resolve().parents[1]/"figures"
DEST.mkdir(exist_ok=True)
def font(size,bold=False):
    return ImageFont.truetype("C:/Windows/Fonts/"+("malgunbd.ttf" if bold else "malgun.ttf"),size)
ink="#18353c"; teal="#1c8277"; orange="#c95c34"; grid="#adc2bc"
def base():
    pic=Image.new("RGB",(1200,720),"#fcfbf4")
    return pic,ImageDraw.Draw(pic)
def title(d,s):d.text((52,36),s,font=font(44,True),fill=ink)
def label(d,x,y,s,sz=28,c=ink):d.text((x,y),s,font=font(sz),fill=c)
def arrow(d,p,q,c):
    d.line((p,q),fill=c,width=5)
    dx=q[0]-p[0];dy=q[1]-p[1];a=math.atan2(dy,dx)
    d.polygon([q,*( (q[0]-17*math.cos(a+k),q[1]-17*math.sin(a+k)) for k in [-.42,.42])],fill=c)

pic,d=base();title(d,"B 소켓을 누를 수 있는 곳과 끼울 수 있는 곳")
cx,cy=334,386;scale=1000
for i in range(-3,4):
    d.line((cx-230,cy+i*65,cx+230,cy+i*65),fill="#e4e9dd",width=2)
    d.line((cx+i*65,cy-230,cx+i*65,cy+230),fill="#e4e9dd",width=2)
d.rectangle((cx-215,cy-215,cx+215,cy+215),outline=ink,width=5)
d.ellipse((cx-155,cy-155,cx+155,cy+155),fill="#d5efe0",outline=teal,width=5)
for dx,dy,n,c in [(0,0,'B',ink),(.14,0,'1',teal),(.17,0,'2',orange),(.12,.12,'3',orange)]:
    x,y=cx+scale*dx,cy-scale*dy;d.ellipse((x-8,y-8,x+8,y+8),fill=c)
    d.text((x+5,y+10 if n!='2' else y-48),n,fill=c,font=font(28,True))
label(d,101,626,"입력 사각형 0.43 m × 0.43 m",26)
label(d,617,185,"B 중심   (0.34, 1.40) m",31)
label(d,617,251,"허용 원 반경   0.155 m",31,teal)
label(d,617,341,"1    가로 0.14 m  →  허용",28,teal)
label(d,617,409,"2    가로 0.17 m  →  거부",28,orange)
label(d,617,477,"3    가로·세로 0.12 m씩",28,orange)
label(d,675,529,"중심 거리 약 0.170 m  →  거부",25,orange)
pic.save(DEST/"repair-fit.png")

pic,d=base();title(d,"같은 관측기를 읽는 두 입력원")
label(d,62,108,"수평 단면 · 점선은 무한한 작업면의 일부",25)
d.line((450,180,450,632),fill=teal,width=6);label(d,352,638,"z = 0.65 m",27,teal)
d.ellipse((916,266,938,288),fill=ink);d.ellipse((810,455,832,477),fill=orange)
arrow(d,(925,276),(450,355),ink);arrow(d,(818,467),(450,355),orange)
d.ellipse((440,345,460,365),fill=teal)
label(d,775,196,"일반 카메라",28)
label(d,822,506,"조준 컨트롤러",28,orange)
label(d,63,341,"B 소켓 중심",31,teal)
label(d,63,405,"X = 0.34 m",25)
label(d,63,445,"Y = 1.40 m",25)
label(d,498,622,"광선 원점은 달라도 놓을 지점은 작업면에 있다.",25)
pic.save(DEST/"repair-plane.png")

pic,d=base();title(d,"기준광을 1×와 4×로 읽으면")
def measure(g):
    result=[]
    for i in range(36):
        dark=11+i%5+2*g
        light=3+sum(h*math.exp(-.5*((i-k)/w)**2) for k,h,w in [(8,24,1.3),(18,78,1.8),(30,42,1.25)])
        raw=min(255,math.floor(light*g+dark+.5));result.append((dark,raw,raw-dark))
    return result
for panel,g in enumerate((1,4)):
    left=80+panel*570;bottom=547;dx=12.5
    label(d,left,145,f"노출 {g}×",33)
    vals=measure(g)
    for val in [0,64,128,192,255]:
        y=bottom-val*1.09;d.line((left,y,left+437,y),fill=grid,width=2)
        label(d,left-41,y-14,str(val),17)
    for i,(dark,raw,corrected) in enumerate(vals):
        x=int(left+i*dx)
        d.rectangle((x,bottom-corrected*1.09,x+9,bottom),fill=orange if raw==255 else teal)
    label(d,left-4,bottom+12,"420",21);label(d,left+197,bottom+12,"510",21);label(d,left+407,bottom+12,"595 nm",21)
    label(d,left,615,"최대 510 nm · 보정값 81" if g==1 else "원자료 255에 닿은 칸 3개",25,ink if g==1 else orange)
pic.save(DEST/"repair-ranges.png")
