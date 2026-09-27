# streamdock-midi

Turns the Stream Dock M18 into a MIDI controller for Cakewalk, GarageBand, Logic, Ableton or any
other DAW, and sends notes to a MIDI port called `StreamDock`. Works on Windows and macOS.

## Built on

- **[streamdock-m18](https://github.com/bidoofgoo/streamdock-m18)**: the M18 driver and
  `dockd`, the daemon that owns the dock and talks to it over USB. This bridge is a `dockd`
  client and does nothing without it. **Required.**
- **[streamdock-m18-firmware](https://github.com/bidoofgoo/streamdock-m18-firmware)**: a
  firmware patch that lets the dock report several keys at once. **Optional, but you want it
  for music:** the stock firmware sees one key at a time, so no chords from separate keys and no
  playing over a held note. Everything here also works on stock firmware, one key at a time.
  Read that repo's warnings before flashing anything: your backup is the only way back.

Clone this repo and streamdock-m18 **next to each other**, since `start.cmd` and `start.sh`
look for `../streamdock-m18`:

```
git clone https://github.com/bidoofgoo/streamdock-m18.git
git clone https://github.com/bidoofgoo/streamdock-m18-midi.git
```

On macOS you can also point `start.sh` elsewhere with `DOCKD_DIR=/path/to/streamdock-m18`.

## One-time setup

### Windows

1. Install **loopMIDI** (free): `winget install TobiasErichsen.loopMIDI`, or from tobias-erichsen.de.
2. Open loopMIDI, type `StreamDock` as the port name, and click **+**. Leave loopMIDI running;
   it can start with Windows from its tray icon.
3. `npm install` in this folder and in your streamdock-m18 clone.
4. In Cakewalk: **Preferences > MIDI > Devices**, tick `StreamDock` under Inputs. On a MIDI or
   instrument track, set the input to `StreamDock > Omni`.

Start loopMIDI **before** Cakewalk, or Cakewalk won't see the port.

### macOS

1. `npm install` in this folder and in your streamdock-m18 clone. Run it on the Mac itself, not on a copied
   `node_modules` from Windows, since both projects have native modules.
2. That's it. The bridge creates the `StreamDock` MIDI port itself while it runs, so there's
   nothing like loopMIDI or the IAC Driver to set up.

- **GarageBand** listens to every MIDI input, so just make a Software Instrument track and play.
  If you started the bridge after GarageBand, it usually picks the port up within a few seconds.
  If not, **GarageBand > Settings > Audio/MIDI** and reset the MIDI drivers.
- **Logic** does the same by default. **Ableton**: under **Settings > Link, Tempo & MIDI**, turn
  on **Track** for the `StreamDock` input.

## Starting it

- **Windows**: double-click `start.cmd`. It opens `dockd` in its own window and runs the bridge.
- **macOS**: `./start.sh` in Terminal (the first time, `chmod +x start.sh`). It runs `dockd` in the
  background and stops it again when you press Ctrl+C.

Or by hand: `npm run dockd` in streamdock-m18, then `npm start` here.

## Controls

| Button | Does |
|---|---|
| 15 screen keys | notes or chords. Grey is the home note or home chord of the key |
| aux left / right | octave down / up |
| aux middle, tap | next layout: Chords, Scale, Pentatonic, Chromatic, Drums |
| aux middle, hold | key picker: tap a home note, major or minor, then tap aux middle to go back |

Everything except Drums follows the key you pick, so "A minor" changes the chords and the notes
together. You start in C major; `--key=Eb` or `--key=F#m` starts somewhere else.

New to music? [LESSON.md](LESSON.md) explains the layouts as a short music lesson: what a key
is, why three keys side by side make a chord, and what the numbers on the chord keys mean.

### The layouts

- **Chords**: one chord per key, labelled with its number in the key (`IV F`) and its name.
  Count up each column (I ii iii, IV V vi, ...); every chord is there low and high. Blue chords
  feel like home, green ones move away, red ones pull back home.
- **Scale**: the seven notes of the key. Any three keys side by side are a chord.
- **Pentatonic**: five notes per row, one octave per row. Nothing in it clashes.
- **Chromatic**: all twelve notes; the ones outside the key are dark.
- **Drums**: General MIDI on channel 10, so they work with any GM drum kit. In GarageBand, pick a
  drum kit on the track (for example the Drum Kit presets under Software Instrument). One
  column per drum group: kick, snare, toms, hi-hat, cymbals.

The others send on channel 1. The LED ring flashes white while keys are held.

### Several keys at once

With the stock firmware the dock sees one key at a time, so play one note or one chord key at a
time. With the rollover firmware from
[streamdock-m18-firmware](https://github.com/bidoofgoo/streamdock-m18-firmware) you can hold
several, with one hardware limit: **while a key is held, the keys above it in the same column
often don't register.** Keys side by side are never affected.

The layouts are built around that. Keys in one column are things you wouldn't play together
anyway: neighbouring notes (which clash), neighbouring chords, two hi-hats. Combinations that
sound good are side by side. If you do want two keys in one column, press the upper one first.

## Options

```
npm start -- --port=wavetable   # any output name substring; wavetable = Windows' built-in synth
npm start -- --velocity=110     # the keys aren't velocity sensitive, so all notes use this
npm run ports                   # list MIDI outputs
```

`--port=wavetable` is a quick way to check it works on Windows without Cakewalk open. On macOS,
passing `--port` switches off the virtual port and sends to an existing output instead (the IAC
Driver, say).
