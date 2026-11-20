; Add-on for the FRS 2.0 ROM (SHA-1 fc500a70a113d7a43f77db66cb21385cdd3f0a95).
; Each ORG is a separate fixed or switched ROM segment.
; FD9D..FD9E are the two unused bytes following the JP in the game's H.KEYI.
selected_basic: equ 0fd9dh
frs_basic: equ 0f87fh
frs_extended: equ 04158h

org 042b8h
basic_hook:
    call frs_basic
    jr finish
extended_hook:
    call frs_extended
finish:
    di
    ld a,(0c940h)
    or a
    ret z                ; Normal BIOS handling outside split-screen scenes.
    pop hl               ; Drop the return to 0C4Dh in the verified BIOS.
    in a,(0bah)
    and 010h
    jr nz,status0
    ld hl,0faffh
    set 7,(hl)
    ld a,020h
    out (0bbh),a
    or 8
    out (0bbh),a
status0:
    in a,(099h)          ; FRS restored R15=0. Keep S1 pending for FRS.
    and a
    jp 00c50h            ; BIOS H.TIMI decision and normal register restore.
fixed_end:

org 0794dh                ; Bank 1, same window as the extended hook installer.
select_extended:
    push af
    ld hl,(selected_basic)
    ld a,h
    cp 042h
    ld hl,frs_extended
    jr nz,selected
    ld hl,extended_hook
selected:
    pop af
    ret
selector_end:

org 0b382h                ; Bank 31 is already mapped by the FRS boot routine.
init:
    push af
    push bc
    push de
    push hl
    ld hl,00006h
    ld de,signature
    ld b,2
    call matches
    jr nz,default_hook
    ld hl,00c4ah
    ld b,9
    call matches
    jr nz,default_hook
    ld hl,01479h
    ld b,22
    call matches
    jr nz,default_hook
    ld hl,0103fh
    ld b,11
    call matches
    ld hl,basic_hook
    jr z,store_hook
default_hook:
    ld hl,frs_basic
store_hook:
    ld (selected_basic),hl
    pop hl
    pop de
    pop bc
    pop af
    jp 0b220h            ; Continue the FRS installation, including its RAM ISR.
matches:
    ld a,(de)
    cp (hl)
    ret nz
    inc de
    inc hl
    djnz matches
    ret
signature:
    db 098h,098h
    db 0cdh,09ah,0fdh,0cdh,079h,014h,0f2h,002h,00dh
    db 0dbh,0bah,0e6h,010h,020h,00dh,021h,0ffh,0fah,0cbh,0feh
    db 03eh,020h,0d3h,0bbh,0f6h,008h,0d3h,0bbh,0c3h,03fh,010h
    db 03eh,001h,0f3h,0d3h,099h,03eh,08fh,0d3h,099h,0dbh,099h
boot_end:
