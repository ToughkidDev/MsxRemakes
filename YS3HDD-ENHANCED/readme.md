# YS III — HDD Enhanced

**by ToughkidCST, 2026** 

· MSX-DOS2 directory install

A folder package. No DSK image is needed, and no DOS system files are included.

---

## Quick start

1. Copy the complete **`YS3`** directory and **`PLAY.BAT`** to the **root directory** of your
   game drive. Keep the subdirectories intact.
2. Boot MSX-DOS2 and select that drive.
3. Type `PLAY`.

Example, with the game on drive **B:**

```
B:
PLAY
```

Or run the game directly:

```
B:
CD \YS3
YS3
```

`YS3.COM` is the game launcher — run it from inside the `YS3` directory.

`PLAY.BAT` changes to `\YS3` on the current drive, then runs `YS3.COM`.

---

## Requirements

| | |
|---|---|
| Machine | MSX2 or newer |
| Mapper RAM | 256 KB |
| VRAM | 128 KB |
| Storage | Writable HDD space, reachable from DOS |
| Free space | **45 MiB or more** (game files are about 37 MiB before file system allocation) |

---

## What is in the package

| Item | Contents |
|---|---|
| `YS3.COM` | Language / game launcher |
| `YS3HDD.BIN` | HDD and sound engine |
| `VIDEO.BIN` | Video helpers |
| `JP` / `EN` | Japanese / English game data |
| `MUSIC` | Makoto, MSX-MUSIC and SCC music data |
| `SAVE01`–`SAVE05` | Shared save files (`.DAT`, `.BAK`, `.STA`) |

---

## Starting the game

| Key | Action |
|---|---|
| `1` | Japanese |
| `2` | English |
| `ESC` | Exit to DOS |

Sound hardware is detected at startup.

| Key | Action |
|---|---|
| `RETURN` | New game |
| `SPACE` | Load game |

## In game

| Key | Action |
|---|---|
| `F4` | Save |
| `F1` | Load |
| `1`–`5` | Save slot |

---

## Upgrading from an earlier version

> **Keep your existing saves.**
> Carry over `SAVE01`–`SAVE05` as complete sets — the `.DAT`, `.BAK` and `.STA` files
> of each slot belong together. **Do not overwrite existing saves with the blank files
> included in this package.**


# Ys III (MSX2, Falcom 1989) — 원작 대비 개선 정리


---

## 한눈에 보기

| 항목 | 원작 (1989, 플로피) | 현재 빌드 |
|---|---|---|
| 매체 | 5.25" 플로피 5장, 지역마다 디스크 교체 | HDD 이미지 1개, 교체 없음. JP/EN 동시 수록 |
| 음원 | 본체 PSG 3채널 전용 | Makoto(YM2608) / MSX-MUSIC(YM2413) / SCC·SCC-I / PSG 폴백 — 31곡 |
| 음악·효과음 | 같은 PSG 3채널을 나눠 씀 | 외장 PSG 검출 시 음악과 효과음을 물리적으로 분리 |
| 수평 스크롤 | 8픽셀 단위 점프, 조작 중 6.4 Hz (약 51 px/s) | V9958 하드웨어 스크롤, VBlank당 4픽셀 보간 |
| 수직 스크롤 | 8라인 단위 | R#23 미세 스크롤 |
| 하드웨어 스크롤 레지스터 | R#23·R#25·R#26·R#27 전부 미사용(항상 0) | R#19 래스터 분할 + R#23/R#25/R#26/R#27 사용 |
| 한 타일 카메라 이동 | — | turbo R 146.12→100.21 ms, MSX2+ 183.86→162.48 ms |
| CPU | 표준 Z80 3.58 MHz | Panasonic 고속 모드 5.37 MHz / turbo R R800 자동 |
| 저장 | 유저 디스크 1장, 섹터 직접 기록 | DOS 파일 5슬롯 공유 + BAK/저널 복구 |
| 언어 | 판본이 따로 | 시작 시 1 일본어 / 2 영어 |
| 최소 RAM | 64 KB | 매퍼 RAM 256 KB |

---

## 1. 매체와 실행

원작은 게임 디스크 1장 + 시나리오 디스크 3장 + 유저 디스크 1장이고, 지역을 넘을 때마다
디스크를 바꿔야 합니다만 ... (영역 0→D1, 1·2→D2, 3·4→D3, 5→D4).

현재 빌드는 MSX-DOS2 / Nextor의 **일반 파일**로 전부 풀어 HDD 이미지 하나에 넣었습니다.
디스크 이미지를 가상 플로피로 마운트하는 방식이 아니라, 게임의 절대 섹터 I/O 진입점과
디스크 교체 루틴만 파일 로딩으로 연결했습니다. 
JP/EN 두 언어 데이터를 한 이미지에 담고 시작할 때 선택하도록 합니다.

## 2. 음악

원작은 본체 PSG(AY-3-8910) 3채널이 전부입니다만, 현재 Enhanced 빌드는 메가드라이브판 Ys III의 
YM2608 원곡 **31곡**을 세 가지 음원으로 어레인지한 곡을 넣고, 기기 구성을 확인해 자동으로 선택합니다.
음원이 발견되지 않으면 원본 PSG로 재생. MSX 고유의 오리지널  스태프롤 등 일부 곡은 오리지널리티를 위해 
PSG버전을 그대로 연주합니다. 

- **Makoto (YM2608)** — FM·SSG·리듬·ADPCM-B. 
- **MSX-MUSIC (YM2413)** 
- **SCC / SCC-I** — SCC-I와 일반 SCC가 음악을 공유.
  
**음악 IRQ 비용 절감** — 매 프레임 게임 메모리를 복사하던 경로를 엔진 세그먼트 임시 매핑으로
바꿔, 비교 구간 평균이 R800 약 2.07→1.73 ms, WX 고속 Z80 약 7.43→5.52 ms로 퍼포먼스를 개선했습니다. 

## 3. 효과음과 PSG 분리

원작은 음악과 효과음이 같은 PSG 3채널을 나눠 쓰므로 효과음이 나면 음악 성부가 끊어지는 문제점.

현재 빌드는 **MegaFlashROM SCC+ SD / MegaFlashROM SCC+ / SuperSoniqs Darky**를 자동 검출해
음악의 PSG 성부를 2nd PSG 카트리지로 보내고 효과음은 본체 PSG로. 우선순위는
Darky → MegaFlashROM → 본체 PSG. 효과음이 없는 동안에는 **SCC 5성부 + PSG 3성부**까지 쓰고,
효과음이 C 또는 B+C를 요구하면 해당 채널과 공통 노이즈 주기를 효과음 드라이버에 양보.

## 4. 화면과 스크롤

원작은 SCREEN 5(256×192)에서 (16,16) 기준 224×128 도트의 플레이필드를 VRAM 페이지 1/2
더블버퍼로 드로잉. **하드웨어 스크롤 레지스터를 하나도 쓰지 않고**(R#23·R#25·R#26·R#27이
1만 5천 프레임 내내 0), 하드웨어 스프라이트 32개도 전부 꺼 둔 채 모든 것을 VDP 블릿으로
합성함.

화면은 **원경 고정 + 근경 1속도**의 2평면. 

현재 빌드는 이 구조를 그대로 이용함. V9958(MSX2+ / turbo R)에서 **R#19 라인 인터럽트로
화면을 3구간으로 나눠**, 위쪽은 게임 페이지 + R#23/R#26/R#27 스크롤 오프셋, 아래쪽은 UI
페이지 + 오프셋 0, VBlank에서 전부 초기화한다. 왼쪽 8도트는 R#25의 MSK로 가림.
따라서 **테두리와 하단 상태창은 고정된 채 플레이필드만 스크롤**.

- 수평: `R#26`(8도트) + `R#27`(0–7도트)로 **VBlank당 4픽셀씩 보간**.
  원작의 "9.4프레임에 한 번 8픽셀 점프"가 4픽셀 단위 이동으로 바뀜.
- 수직: `R#23`으로 미세 이동하며, 플레이필드 페이지에 8줄 가드 스트립을 둠.
- 배경 재합성이 필요 없는 구간은 32열 VRAM 링으로 재사용하고 **변경된 타일만** 그림.
- **원래 배경 시차(원경 고정)를 유지.** 인트로·이벤트·대화·메뉴는 원본 묘화를 사용.
- MSX2(V9938)는 기존 렌더러로 동작.

**그래픽 모드 선택** — V9958 기기에서 언어·음원 선택 뒤 `1 Quality`(기본) / `2 Performance`를
선택. Performance는 먼 배경의 카메라 이동을 고정하고, 변경되지 않은 지형·배경 합성을
재사용함. 

## 5. 속도

- 게임 엔진 시작 시 Panasonic FS-A1WX/WSX/FX의 **하드웨어 고속 모드(5.37 MHz)** 를 켜고,
  turbo R은 BIOS CHGCPU로 **R800 ROM 모드**를 선택. 일반 MSX2는 원래 속도를 유지.
- 고속 CPU에서 화면이 고정된 구간의 주인공만 급가속하는 현상을 보정. 각 구역의
  스크롤 갱신 시간 4회 이동평균을 VBlank로 재고, 카메라가 멈췄을 때 부족한 시간만 기다림.
  마을 고정 화면 기준 ST 약 38.5 → 7.9회/초, WX 약 15.4 → 6.4회/초.

## 6. 저장

| | 원작 | 현재 |
|---|---|---|
| 매체 | 유저 디스크(플로피) 섹터 직접 기록 | HDD의 일반 DOS 파일 |
| 슬롯 | 1개 | **5개**, JP/EN 공유 |
| 실패 대비 | 없음 | `DAT` + `BAK` + 진행 상태 저널. 저장 중 중단 시 백업 자동 복구 |
| 기타 | — | 슬롯 미리보기, 파일 100 KiB 선할당(게임이 생성·절단하지 않음) |

실제 DOS 중단 시험(슬롯 5 첫 섹터 오염 후 13번째 4 KB 블록 close에서 종료)에서
JP/ST/SCC-I와 EN/WX/OPLL 모두 재부팅 후 48바이트 상태를 복구하고 진행·음악을 이어감.

## 8. 동작 환경

| 기종 | 렌더러 | CPU | 음원 |
|---|---|---|---|
| MSX2 (V9938) | 원본 묘화 | 표준 3.58 MHz | SCC-I·SCC / MSX-MUSIC / Makoto / PSG |
| MSX2+ (V9958) | 하드웨어 스크롤 + Quality/Performance | Panasonic 고속 5.37 MHz | 동일 |
| turbo R | 동일 | R800 ROM 모드 | 동일 |

최소 매퍼 RAM 256 KB. 
