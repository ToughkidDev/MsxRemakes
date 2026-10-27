# IPS PATCHER

ROM 파일에 IPS 패치를 적용하거나, 원본 ROM과 수정한 ROM을 비교해 IPS 패치를 만드는 웹 도구입니다.
Apply an IPS patch to a ROM, or create an IPS patch from an original and a modified ROM.

**사용하기 / Open:** https://toughkiddev.github.io/MsxRemakes/IPSPATCHER/

## 기능 / Features

- **패치 적용 (Apply patch):** 원본 ROM + IPS 파일 → 패치된 ROM
- **IPS 만들기 (Create IPS):** 원본 ROM + 수정한 ROM → IPS 파일
- 파일 크기와 CRC32 표시, IPS 레코드 수 표시
- RLE 레코드와 결과 크기 조정(truncate) 확장 지원, 최대 16MiB
- 한국어 · English · 日本語

파일은 서버로 올라가지 않으며, 모든 처리는 브라우저 안에서만 이루어집니다.
Nothing is uploaded; everything runs inside the browser.

## 파일 / Files

- `index.html` — 화면 / page
- `ips.js` — IPS 읽기·적용·생성 / IPS parse, apply and create
