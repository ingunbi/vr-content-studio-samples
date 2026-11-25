from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
proj=Path(__file__).resolve().parents[1]
font=proj.parents[3]/'assets/fonts'
(proj/'figures').mkdir(exist_ok=True)
def face(sz,b=False):
    source=font/('NanumGothic-Bold.ttf' if b else 'NanumGothic-Regular.ttf')
    if not source.is_file():source=Path('C:/Windows/Fonts')/('malgunbd.ttf' if b else 'malgun.ttf')
    return ImageFont.truetype(str(source),sz)
def plate(title):
    im=Image.new('RGB',(1260,710),'#F5F3E8');d=ImageDraw.Draw(im)
    d.text((44,34),title,fill='#183D44',font=face(43,True));return im,d
def label(d,xy,t,sz=25,fill='#24444B',anchor=None):
    d.text(xy,t,font=face(sz),fill=fill,anchor=anchor)
def save(im,name):im.save(proj/'figures'/name,optimize=True)
im,d=plate('배의 위치와 확정되는 시각')
for x,z,key,t in [(140,500,'본항','0'),(443,330,'구간의 중간','1.5'),(746,160,'종탑섬','3')]:
    d.ellipse((x-12,z-12,x+12,z+12),fill='#0D7164')
    label(d,(x+20,z),key,29);label(d,(x+20,z+43),t+'분',24)
d.line([(140,500),(746,160)],width=5,fill='#398582')
label(d,(60,596),'중간의 배는 보간 위치에 있다. 첫 도착 기록은 3분 경계에서 생긴다.',29)
for i,t in enumerate(['출항 상태','at = home','time = 0','leg.elapsed = 1.5']):
    label(d,(876,187+i*57),t,27)
save(im,'post-position.png')
im,d=plate('일지에 기록되는 두 항차')
for j,(title,stops) in enumerate([('종탑 먼저',[(0,'본항'),(3,'종탑'),(6,'등대'),(10,'부표'),(12,'본항')]),('등대 먼저',[(0,'본항'),(2,'부표'),(6,'등대'),(7,'대기'),(8,'대기'),(11,'종탑'),(14,'본항')])]):
    base=225+j*195;label(d,(48,base-72),title,31)
    d.line((100,base,1164,base),width=4,fill='#7D9990')
    for n,place in stops:
        x=100+76*n;d.ellipse((x-10,base-10,x+10,base+10),fill='#986138' if place=='대기' else '#217466')
        label(d,(x,base+38),place,24,anchor='mm');label(d,(x,base-34),str(n),24,anchor='mm')
for i in range(15):
    x=62+i*76;d.rectangle((x,535,x+74,590),fill='#467E82' if i%8<4 else '#52606A')
    label(d,(x+37,562),str(i),23,'white','mm')
label(d,(60,623),'아래 눈금에서 밝은 구간은 만조다. 얕은 수로에서는 출발 분의 색을 읽는다.',26)
save(im,'post-timetable.png')
im,d=plate('계획을 고치는 시점에 따라 남는 상태')
def box(x,y,t,m):
    d.rounded_rectangle((x,y,x+310,y+110),16,fill='#D8E9DC',outline='#698E82',width=3)
    label(d,(x+14,y+14),t,29);label(d,(x+14,y+63),m,23)
box(45,155,'계획','plan 배열 편집');box(473,155,'운항','현재 한 구간 소비');box(901,155,'귀환','두 배달 + 본항')
for x in [355,783]:d.line((x,205,x+118,205),fill='#63817B',width=4);d.polygon([(x+118,205),(x+100,196),(x+100,214)],fill='#63817B')
box(45,383,'한 칸 취소','마지막 예정만 제거');box(473,383,'다음 정박','현재 구간 뒤 정지');box(901,383,'새 항차','시각·편지·일지 초기화')
for x in [200,628,1056]:d.line((x,265,x,383),fill='#63817B',width=4)
label(d,(53,596),'정박한 자리에서 다시 계획할 수 있다. 새 항차는 언제나 본항에서 출발한다.',28)
save(im,'post-modes.png')
