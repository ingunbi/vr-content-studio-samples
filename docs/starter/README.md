# 시선 측정실

압축을 푼 뒤 vendor와 starter가 함께 들어 있는 상위 폴더에서 서버를 시작한다.

```text
python -m http.server 8000 --bind 127.0.0.1
```

같은 PC의 브라우저에서 http://127.0.0.1:8000/starter/index.html 을 연다. Windows 실행기를 사용하는 경우 작품을 하나 연 뒤 같은 브라우저 주소의 호스트와 임시 포트까지 유지하고 경로를 /starter/index.html 로 바꾼다. 위쪽의 네 링크는 각각 별도로 실행된다. 순서대로 01-room.mjs에서 카메라 높이를, 02-ray.mjs에서 가림판의 깊이를, 03-press.mjs에서 누름 상태를, 04-xr.mjs에서 세션과 추적을 변경해 본다. 화면을 새로 고치면 선택 횟수가 초기화된다.

헤드셋 자체 브라우저의 localhost는 그 헤드셋을 가리킨다. 다른 장치에서 들어올 때는 브라우저가 신뢰하는 HTTPS 기원과 연결 가능한 WebXR 브라우저·기기 조합이 필요하다. 네 번째 실습은 local-floor를 요구한다. 종료는 세션 메뉴 또는 데스크톱 페이지의 VR 나가기에서 할 수 있다.

Node가 있으면 starter 폴더에서 `node --test tests/latch.test.mjs`로 두 입력원과 취소 시나리오를 검증한다. Python용 Playwright와 Chrome이 준비된 환경에서는 `python tests/desktop.py http://127.0.0.1:8000`으로 네 페이지를 재생한다. 이 명령은 figures의 데스크톱 시험 화면과 tests/desktop-result.json을 다시 쓴다. 기기 추적과 착용 시험은 별도로 수행해야 한다.

도해를 다시 그릴 때는 Python용 Pillow를 설치한 뒤 starter에서 `python tests/plates.py`를 실행한다. 네 작품의 비교 그림은 같은 위치에서 `python tests/profile.py http://127.0.0.1:8000`으로 만든다. 한글 레이블이 있는 그림에는 맑은 고딕 또는 사용 가능한 한글 글꼴이 필요하다. 기본 글꼴이 없는 환경에서는 VR_KOREAN_FONT 환경변수로 설치된 한글 TTF나 TTC 파일의 전체 경로를 지정한다.
