import os
from pathlib import Path
from PIL import ImageFont

def font(size,bold=False):
    explicit=os.environ.get('VR_KOREAN_FONT')
    paths=[explicit] if explicit else [
        'C:/Windows/Fonts/malgun'+('bd' if bold else '')+'.ttf',
        '/System/Library/Fonts/AppleSDGothicNeo.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-'+('Bold' if bold else 'Regular')+'.ttc',
        '/usr/share/fonts/truetype/nanum/NanumGothic'+('Bold' if bold else '')+'.ttf',
    ]
    for path in paths:
        if Path(path).is_file():return ImageFont.truetype(path,size)
    raise FileNotFoundError('VR_KOREAN_FONT 환경변수에 한글 TTF/TTC 파일의 전체 경로를 지정하세요.')
