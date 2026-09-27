# streamdock-midi

Turns the Stream Dock M18 into a MIDI controller for Cakewalk, GarageBand, Logic, Ableton or any
other DAW. It's a client of `dockd` from `../streamdock-m18`, and sends notes to a MIDI port
called `StreamDock`. Works on Windows and macOS.

## One-time setup

### Windows

1. Install **loopMIDI** (free): `winget install TobiasErichsen.loopMIDI`, or from tobias-erichsen.de.
2. Open loopMIDI, type `StreamDock` as the port name, and click **+**. Leave loopMIDI running;
   it can start with Windows from its tray icon.
3. `npm install` in this folder and in `streamdock-m18`.
4. In Cakewalk: **Preferences > MIDI > Devices**, tick `StreamDock` under Inputs. On a MIDI or
   instrument track, set the input to `StreamDock > Omni`.

Start loopMIDI **before** Cakewalk, or Cakewalk won't see the port.

### macOS

1. `npm install` in this folder and in `streamdock-m18`. Run it on the Mac itself, not on a copied
   `node_modules` from Windows, since both projects have native modules.
2. That's it. The bridge creates the `StreamDock` MIDI port itself while it runs, so there's
   nothing like loopMIDI or the IAC Driver to set up.

- **GarageBand** listens to every MIDI input, so just make a Software Instrument track and play.
  If you started the bridge after GarageBand, it usually picks the port up within a few seconds.
  If not, **GarageBand > Settings > Audio/MIDI** and reset the MIDI drivers.
- **Logic** does the same by default. **Ableton**: under **Settings > Link, Tempo & MIDI**, turn
  on **Track** for the `StreamDock` input.

## Every day

- **Windows**: double-click `start.cmd`. It opens `dockd` in its own window and runs the bridge.
- **macOS**: `./start.sh` in Terminal (the first time, `chmod +x start.sh`). It runs `dockd` in the
  background and stops it again when you press Ctrl+C.

Or by hand: `npm run dockd` in streamdock-m18, then `npm start` here.

## Controls

| Button | Does |
|---|---|
| 15 screen keys | notes or chords. Labels show what they play; grey keys are the root |
| aux left / right | octave down / up |
| aux middle | next layout: Chords, Drums, Minor Pent, Minor, Major, Chromatic |

The dock only sees **one key at a time** (no chords, no button combos), so the **Chords** layout,
which is the one you start in, plays a whole chord from each key. Each column is one chord of C
major (C, F, G, Am, Dm). The bottom row plays it plain, the middle row as a 7th and the top row as
a rock power chord. Every chord fits the key, so any order sounds fine.

Drums are General MIDI on channel 10, so they work with any GM drum kit. In GarageBand, pick a
drum kit on the track (for example the Drum Kit presets under Software Instrument); kick, snare
and hi-hats land on the usual keys. The chord and scale layouts send on channel 1 and rise from
bottom-left, like pads. The LED ring flashes white on each hit.

## Options

```
npm start -- --port=wavetable   # any output name substring; wavetable = Windows' built-in synth
npm start -- --velocity=110     # the keys aren't velocity sensitive, so all notes use this
npm run ports                   # list MIDI outputs
```

`--port=wavetable` is a quick way to check it works on Windows without Cakewalk open. On macOS,
passing `--port` switches off the virtual port and sends to an existing output instead (the IAC
Driver, say).
