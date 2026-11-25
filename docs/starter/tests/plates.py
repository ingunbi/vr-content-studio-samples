from pathlib import Path
import math
from PIL import Image,ImageDraw
from platefont import font
out=Path(__file__).resolve().parents[1]/'figures'
out.mkdir(exist_ok=True)
ink='#243d47';teal='#28776a';gold='#976727';blue='#466b8c';rule='#acbab5'
def text(d,xy,s,n=30,c=ink,b=False,anchor='mm'):d.text(xy,s,font=font(n,b),fill=c,anchor=anchor)
def plate(title,caption):
    im=Image.new('RGB',(1420,820),'#f6f5ee');d=ImageDraw.Draw(im)
    d.rectangle((0,0,1420,13),fill=teal)
    text(d,(60,78),title,48,ink,True,'lm');text(d,(62,153),caption,28,ink,False,'lm')
    return im,d
def arrow(d,a,b,c,width=6):
    d.line((a,b),fill=c,width=width)
    angle=math.atan2(b[1]-a[1],b[0]-a[0])
    d.polygon([b]+[(b[0]-19*math.cos(angle+s),b[1]-19*math.sin(angle+s))for s in(-.5,.5)],fill=c)
def node(d,x,y,txt,c=teal):d.ellipse((x-11,y-11,x+11,y+11),fill=c);text(d,(x,y+46),txt,27,c,True)
im,d=plate('표식 중심은 눈높이에 놓인다','옆에서 본 측정실. 오른쪽이 −Z 방향이며, 아래 눈의 시선은 위로 기울어진다.')
for y in (370,475,680):d.line((80,y,1340,y),fill=rule,width=2)
d.rectangle((1115,290,1160,515),fill='#d6a064')
arrow(d,(310,370),(1115,370),teal);arrow(d,(310,475),(1115,370),gold)
node(d,310,370,'',teal);node(d,310,475,'',gold)
text(d,(80,345),'눈 1.60 m',28,teal,True,'lm');text(d,(80,506),'눈 1.10 m',28,gold,True,'lm')
text(d,(1150,555),'표식 중심 1.60 m',28);text(d,(302,615),'Z = 4',30);text(d,(1135,615),'Z = −2',30)
text(d,(710,744),'세로 차이 0.50 m / 수평 거리 6 m → 약 4.76° 위',32,ink,True)
im.save(out/'bench-eye-section.png')
im,d=plate('누름 한 번에는 시작과 끝이 있다','같은 손의 세 경우. 가운데 구간에서 무슨 일이 생겼는지에 따라 결과가 갈린다.')
for i,(lab,items,res,col) in enumerate([('동일 표식',['A 누름','A 유지','A 놓음'],'A 선택',teal),('다른 표식',['A 누름','B로 이동','B 놓음'],'취소',gold),('추적 상실',['A 누름','추적 끊김','A에서 놓음'],'취소',blue)]):
    y=278+i*144;text(d,(60,y),lab,32,col,True,'lm')
    for j,s in enumerate(items+[res]):
        x=390+j*265;d.rounded_rectangle((x-107,y-38,x+107,y+38),radius=12,fill='#e0e8df',outline=col,width=2)
        text(d,(x,y),s,28,col,j==3)
        if j<3:arrow(d,(x+112,y),(x+151,y),col,4)
text(d,(710,750),'추적이 돌아오면 포인터를 복구한다. 다음 선택은 새로 누른 뒤에 성립한다.',29,ink,True)
im.save(out/'bench-input-traces.png')
im,d=plate('창의 좌표를 광선으로 바꾸기','캔버스 사각형 안의 상대 위치만 사용하면 문서 여백이나 스크롤의 영향을 줄일 수 있다.')
d.rectangle((150,255,878,673),fill='#e0e8df',outline=ink,width=4)
d.line((514,255,514,673),fill=rule,width=2);d.line((150,464,878,464),fill=rule,width=2)
for x,y,s in [(150,255,'좌상단 (−1, +1)'),(514,464,'중앙 (0, 0)'),(696,360,'우상 (0.5, 0.5)')]:
    node(d,x,y,'',teal);text(d,(x+13,y+20),s,24,ink,False,'lm')
text(d,(922,320),'가로 비율',31,teal,True,'lm');text(d,(922,379),'0.75 → 0.50',31,ink,False,'lm')
text(d,(922,480),'세로 비율',31,teal,True,'lm');text(d,(922,539),'0.25 → 0.50',31,ink,False,'lm')
text(d,(710,744),'세로 웹 좌표는 아래로 커진다. 카메라에 전할 때 부호를 뒤집는다.',31,ink,True)
im.save(out/'bench-pointer-map.png')
