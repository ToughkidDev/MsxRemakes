# BPS PATCHER

ROM 파일에 BPS 패치를 적용하거나, 원본 ROM과 수정한 ROM을 비교해 BPS 패치를 만드는 웹 도구입니다.
Apply a BPS patch to a ROM, or create a BPS patch from an original and a modified ROM.

**사용하기 / Open:** https://toughkiddev.github.io/MsxRemakes/BPSPATCHER/

## 기능 / Features

- **패치 적용 (Apply patch):** 원본 ROM + BPS 파일 → 패치된 ROM
- **BPS 만들기 (Create BPS):** 원본 ROM + 수정한 ROM → BPS 파일 (진행률 표시)
- 패치에 기록된 원본·결과의 크기와 CRC32를 확인해, 맞지 않는 원본이면 바로 알려줌 (건너뛰기 옵션 있음)
- 크기 제한 없음. 데이터가 옮겨지거나 끼워 넣어진 경우도 작게 기록 (SourceCopy / TargetCopy)
- 파일 끌어다 놓기: 칸에 하나씩, 또는 여러 파일을 페이지 아무 곳에나 한 번에 (BPS 파일은 자동 인식)
- 한국어 · English · 日本語

파일은 서버로 올라가지 않으며, 모든 처리는 브라우저 안에서만 이루어집니다.
Nothing is uploaded; everything runs inside the browser.

IPS 패치는 [IPS PATCHER](https://toughkiddev.github.io/MsxRemakes/IPSPATCHER/)를 쓰세요.

## 파일 / Files

- `index.html` — 화면 / page
- `bps.js` — BPS 읽기·적용·생성 / BPS parse, apply and create
