YS III - HDD Enhanced
by ToughkidCST 2026

MSX-DOS2 DIRECTORY INSTALL

1. Copy the complete YS3 directory
   and PLAY.BAT to your game drive's
   root directory. Keep subdirectories.
2. Boot MSX-DOS2 and select that drive.
3. Enter PLAY to start the game.

Example (game drive B:):
B:
PLAY

Or run the game directly:
B:
CD \YS3
YS3

YS3.COM is the game launcher.
Run it from inside the YS3 directory.
PLAY.BAT changes to \YS3 on the current
drive before running YS3.COM.

REQUIREMENTS
MSX2 or newer, 256KB mapper RAM,
128KB VRAM, writable HDD space.
Game files: about 37MiB before file
system allocation. Allow at least
45MiB free.
The drive must be accessible from DOS.

FILES
YS3.COM      Language/game launcher
YS3HDD.BIN   HDD and sound engine
VIDEO.BIN    Video helpers
JP / EN      Japanese / English data
MUSIC        Makoto / MSX-MUSIC / SCC
SAVE01..05   Shared DAT, BAK, STA files

1: Japanese   2: English   ESC: exit
Sound hardware is detected at startup.
RETURN: new game   SPACE: load game
F4: save   F1: load   Slots: 1 to 5

On upgrade,
keep your existing SAVE01..05 DAT, BAK
and STA files together. Do not overwrite
existing saves with the blank files.

This folder package needs no DSK image.
DOS system files are not included.
