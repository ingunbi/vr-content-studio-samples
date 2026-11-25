from pathlib import Path
from PIL import Image,ImageDraw
import math
import sys

out=Path(__file__).resolve().parents[1]/'figures'
out.mkdir(exist_ok=True)
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'starter'/'tests'))
from platefont import font
ink='#233e47';teal='#28776a';gold='#935e27'; bg='#f6f5ee';rule='#a9bdb7'
def sheet(title,sub):
    im=Image.new('RGB',(1420,860),bg);d=ImageDraw.Draw(im)
    d.rectangle((0,0,1420,13),fill=teal);d.text((57,38),title,font=font(48,True),fill=ink)
    d.text((60,112),sub,font=font(26),fill=ink);return im,d
def arrow(d,a,b,color=teal,width=6):
    d.line([a,b],fill=color,width=width)
    angle=math.atan2(b[1]-a[1],b[0]-a[0])
    d.polygon([b]+[(b[0]-18*math.cos(angle+s),b[1]-18*math.sin(angle+s))for s in(-.48,.48)],fill=color)
def label(d,xy,s,size=29,col=ink,b=False,anchor='mm'):d.text(xy,s,font=font(size,b),fill=col,anchor=anchor)
im,d=sheet('열람 위치는 작품과 설명 사이에 놓는다','평면에서 본 가운데 전시대. 오른쪽은 +X, 아래쪽은 입구 방향 +Z다.')
x0,y0=420,250
pt=lambda x,z:(x0+x*175,y0+(z+3.15)*90)
for x in [-1,0,1,2,3,4]:
    d.line([pt(x,-3.6),pt(x,2)],fill=rule,width=1)
for z in [-3,-2,-1,0,1]:
    d.line([pt(-1.25,z),pt(4.4,z)],fill=rule,width=1)
def disc(d,x,y,r,c):d.ellipse((x-r,y-r,x+r,y+r),fill=c)
p=pt(0,-3.15);disc(d,*p,39,gold);label(d,(p[0],p[1]-60),'작품',28,gold,True)
q=pt(2.29,-2.28);d.rounded_rectangle((q[0]-160,q[1]-13,q[0]+160,q[1]+13),radius=8,fill=teal)
label(d,(q[0],q[1]-53),'열람 카드',28,teal,True)
a=pt(1.1,1.66);b=pt(1.4,1.66)
for target in [p,q]:d.line([a,target],fill=ink,width=3)
disc(d,*a,13,teal);disc(d,*b,13,gold)
label(d,(a[0]-5,a[1]+58),'앞면 위치',26,teal,True,'rm');label(d,(b[0]+12,b[1]+58),'옆면 위치',26,gold,True,'lm')
label(d,(710,800),'옆면 버튼은 관람 위치를 0.30만큼 옮기고, 작품 그룹을 Y축으로 −65° 돌린다.',28)
im.save(out/'gallery-floor-plan.png')

im,d=sheet('기록과 해설은 다른 칸에 쓴다','조각 거울을 앞면과 옆면에서 읽은 뒤 어떤 원고를 열 수 있는지 비교한다.')
cells=[(72,218,457,570),(519,218,903,570),(965,218,1349,570)]
for i,(x,y,r,t) in enumerate(cells):
    d.rounded_rectangle((x,y,r,t),radius=15,fill=['#d8e9df','#f2e5c9','#dbe5ec'][i],outline=rule,width=2)
for i,(title,body) in enumerate([('단서 수첩',['옆면 채록','버팀대가 세 조각을 받침']),('편집 원고',['복원 해설 선택','관측으로 바꾸면 앞면 필요']),('공개 전시',['주문한 순서대로 읽기','선택한 해설을 작품에 붙임'])]):
    x,y,r,t=cells[i];cx=(x+r)//2;label(d,(cx,305),title,40,ink,True)
    for j,line in enumerate(body):label(d,(cx,421+j*56),line,25)
for x in [458,903]:arrow(d,(x+3,388),(x+56,388))
label(d,(710,688),'채록은 선택을 강요하지 않는다. 해설을 바꾸어도 수첩의 단서는 남는다.',32,ink,True)
label(d,(710,755),'전시 열기를 누를 때 각 작품의 선택과 해당 단서가 맞는지 검사한다.',26)
im.save(out/'gallery-edit-model.png')

im,d=sheet('행 번호와 작품 ID를 떨어뜨려 본다','‘한 칸 앞으로’를 두 번 누를 때, 두 번째 클릭은 새 자리에서 이루어진다.')
cols=[('처음',['밤눈 고리','조각 거울','접힌 항로']),('한 번 이동',['밤눈 고리','접힌 항로','조각 거울']),('두 번 이동',['접힌 항로','밤눈 고리','조각 거울'])]
for k,(cap,items) in enumerate(cols):
    x=90+k*462;label(d,(x+152,245),cap,33,ink,True)
    for j,it in enumerate(items):
        y=322+j*100;d.rounded_rectangle((x,y,x+310,y+73),radius=8,fill=('#cfe7da' if it=='접힌 항로' else '#e1e8e5'))
        label(d,(x+35,y+35),str(j+1),26,gold,True);label(d,(x+165,y+35),it,32,ink,True)
for x in [406,868]:arrow(d,(x+3,451),(x+124,451))
label(d,(710,698),'route는 3행 → 2행 → 1행으로 옮겨 간다.',35,ink,True)
label(d,(710,764),'route의 관측 해설과 채록 메모는 행 번호를 키로 쓰지 않으므로 따라간다.',26)
im.save(out/'gallery-reorder.png')
