//
// StreamDock M18 -> MIDI bridge.
//
// A dockd client (see streamdock-m18/CLIENTS.md) that turns the 15 screen keys
// into MIDI notes on a virtual MIDI port, so a DAW like Cakewalk sees the dock
// as a MIDI keyboard.
//
//   aux left     octave down
//   aux middle   next layout
//   aux right    octave up
//
// No combos: the dock only sees one key at a time, aux buttons included.
//
// Usage:
//   npm run dockd                 (in streamdock-m18, owns the device)
//   npm start                     (this, sends to the port named "StreamDock";
//                                  on macOS/Linux it creates that port itself)
//   npm start -- --port=wavetable (any substring of an output port name)
//   npm run ports                 (list output ports)
//

import net from 'node:net';
import midi from '@julusian/midi';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const PORT_NAME = String(args.port ?? 'streamdock').toLowerCase();
const DOCKD_PORT = Number(args.dockd ?? 5548);
const VELOCITY = Number(args.velocity ?? 100);

const AUX_LEFT = 15, AUX_MIDDLE = 16, AUX_RIGHT = 17;

// ---- layouts ----------------------------------------------------------------
//
// Grid index 0 is top-left. Scale layouts run like a pad controller: lowest
// note bottom-left, rising left to right, then up a row.

const SCALES = {
  'Minor Pent': [0, 3, 5, 7, 10],
  'Minor': [0, 2, 3, 5, 7, 8, 10],
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// General MIDI percussion, channel 10. Cymbals on top, toms in the middle,
// kick and snare along the bottom where your thumbs are.
const DRUMS = [
  [49, 'Crash'], [57, 'Crash2'], [55, 'Splash'], [51, 'Ride'], [53, 'Bell'],
  [42, 'HH Cl'], [46, 'HH Op'], [50, 'Tom Hi'], [47, 'Tom Md'], [45, 'Tom Lo'],
  [36, 'Kick'], [38, 'Snare'], [40, 'Snr 2'], [39, 'Clap'], [37, 'Rim'],
];

// The dock reports one key at a time (PROTOCOL.md, "One key at a time"), so
// chords have to come from a single press. Each column is one chord of the
// major key; going up a column changes its flavour, not which chord it is.
// Every chord is diatonic, so any order of presses sounds right together.
const CHORD_DEGREES = [
  // [semitones above the key, triad, seventh]
  [0, 'maj', 'maj7'],   // I
  [5, 'maj', 'maj7'],   // IV
  [7, 'maj', '7'],      // V
  [9, 'min', 'min7'],   // vi
  [2, 'min', 'min7'],   // ii
];

const CHORD_SHAPES = {
  maj: [0, 4, 7], min: [0, 3, 7],
  maj7: [0, 4, 7, 11], 7: [0, 4, 7, 10], min7: [0, 3, 7, 10],
  power: [0, 7, 12],
};

const CHORD_SUFFIX = { maj: '', min: 'm', maj7: 'maj7', 7: '7', min7: 'm7', power: '5' };

const LAYOUTS = [
  { name: 'Chords', chords: true, channel: 0, color: '#3a1d4f', ring: [180, 40, 200] },
  { name: 'Drums', drums: true, channel: 9, color: '#5a1d1d', ring: [200, 40, 20] },
  ...Object.entries(SCALES).map(([name, steps], i) => ({
    name, steps, channel: 0,
    color: ['#1d3557', '#2d1d57', '#1d4f3a', '#4a3a1d'][i],
    ring: [[30, 80, 220], [110, 40, 220], [20, 180, 90], [220, 150, 20]][i],
  })),
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = n => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);

const state = { layout: 0, root: 48 /* C3 */ };

// What a key plays: one or more MIDI notes, plus its label.
function keyToNotes(index) {
  const layout = LAYOUTS[state.layout];
  const cols = 5, rows = 3;
  const col = index % cols;
  const row = rows - 1 - Math.floor(index / cols);   // 0 = bottom row

  if (layout.drums) return { notes: [DRUMS[index][0]], label: DRUMS[index][1], root: false };

  if (layout.chords) {
    // bottom: plain chords, middle: sevenths, top: rock power chords
    const [offset, triad, seventh] = CHORD_DEGREES[col];
    const shape = [triad, seventh, 'power'][row];
    const base = state.root + offset;
    return {
      notes: CHORD_SHAPES[shape].map(n => base + n),
      // the space wraps onto a second line; without the octave, octave up
      // and down would repaint identical labels
      label: NOTE_NAMES[base % 12] + CHORD_SUFFIX[shape] + ' ' + noteName(base),
      root: col === 0,
    };
  }

  const step = row * cols + col;
  const { steps } = layout;
  const note = state.root + 12 * Math.floor(step / steps.length) + steps[step % steps.length];
  return { notes: [note], label: noteName(note), root: step % steps.length === 0 };
}

// ---- MIDI -------------------------------------------------------------------

const out = new midi.Output();
const ports = Array.from({ length: out.getPortCount() }, (_, i) => out.getPortName(i));

if (args.list) {
  ports.forEach((p, i) => console.log(`${i}: ${p}`));
  process.exit(0);
}

// macOS and Linux can create a virtual port themselves, which every DAW
// (GarageBand, Logic, Ableton) picks up as an input. Windows can't, hence
// loopMIDI there.
if (process.platform !== 'win32' && args.port === undefined) {
  out.openVirtualPort('StreamDock');
  console.log('MIDI out: virtual port "StreamDock"');
} else {
  const portIndex = ports.findIndex(p => p.toLowerCase().includes(PORT_NAME));
  if (portIndex < 0) {
    console.error(`No MIDI output matching "${PORT_NAME}". Available:`);
    ports.forEach(p => console.error(`  ${p}`));
    console.error('Create a port called "StreamDock" in loopMIDI, or pass --port=<name>.');
    process.exit(1);
  }
  out.openPort(portIndex);
  console.log(`MIDI out: ${ports[portIndex]}`);
}

// Remember what each key actually sent, so a release after an octave change
// still turns off the right notes.
const held = new Map();   // key index -> { notes, channel }

function noteOn(index) {
  const notes = keyToNotes(index).notes.filter(n => n >= 0 && n <= 127);
  const { channel } = LAYOUTS[state.layout];
  for (const n of notes) out.sendMessage([0x90 | channel, n, VELOCITY]);
  held.set(index, { notes, channel });
}

function noteOff(index) {
  const h = held.get(index);
  if (!h) return;
  for (const n of h.notes) out.sendMessage([0x80 | h.channel, n, 0]);
  held.delete(index);
}

function allNotesOff() {
  for (const index of [...held.keys()]) noteOff(index);
}

// ---- dockd client -----------------------------------------------------------

let sock = null;
let device = null;
const send = o => sock?.writable && sock.write(JSON.stringify(o) + '\n');

function paint() {
  if (!device || device.state !== 'online') return;
  const layout = LAYOUTS[state.layout];
  for (let i = 0; i < device.keys; i++) {
    const { label, root } = keyToNotes(i);
    send({ cmd: 'key', index: i, label, color: root ? '#b0b0b0' : layout.color,
      textColor: root ? '#000000' : '#ffffff' });
  }
  paintLeds(false);
}

function paintLeds(hit) {
  const { ring } = LAYOUTS[state.layout];
  send({ cmd: 'led', zone: 'ring', color: hit ? [255, 255, 255] : ring });
  send({ cmd: 'led', zone: 'front', color: hit ? [255, 255, 255] : ring.map(c => c >> 2) });
}

function announce() {
  const layout = LAYOUTS[state.layout];
  const where = layout.drums ? '' : ` from ${noteName(state.root)}`;
  console.log(`layout: ${layout.name}${where}`);
}

function onKey({ index, state: down }) {
  if (index < AUX_LEFT) {
    if (down) {
      noteOn(index);
      if (held.size === 1) paintLeds(true);
    } else {
      noteOff(index);
      if (held.size === 0) paintLeds(false);
    }
    return;
  }

  if (!down) return;

  if (index === AUX_MIDDLE) {
    state.layout = (state.layout + 1) % LAYOUTS.length;
    announce();
    paint();
    return;
  }

  if (LAYOUTS[state.layout].drums) return;
  const next = state.root + (index === AUX_LEFT ? -12 : 12);
  if (next < 0 || next > 108) return;
  state.root = next;
  announce();
  paint();
}

function connect() {
  let buffer = '';
  sock = net.connect(DOCKD_PORT, '127.0.0.1');
  sock.setEncoding('utf8');

  sock.on('connect', () => console.log('connected to dockd'));
  sock.on('data', chunk => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      if (!line.trim()) continue;

      const msg = JSON.parse(line);
      switch (msg.type) {
        case 'hello':
          device = msg;
          if (msg.state === 'online') { announce(); paint(); }
          else console.log('dockd is up, waiting for the dock to be plugged in');
          break;
        case 'device':
          if (msg.state === 'online') { device = msg; paint(); }
          else { device = msg; allNotesOff(); console.log(`dock offline: ${msg.reason ?? ''}`); }
          break;
        case 'key':
          onKey(msg);
          break;
        case 'error':
          console.error(`dockd: ${msg.message}`);
          break;
      }
    }
  });

  sock.on('error', err => {
    if (err.code === 'ECONNREFUSED') return;   // handled by close + retry
    console.error(`socket: ${err.message}`);
  });

  sock.on('close', () => {
    allNotesOff();
    if (device !== undefined) console.log('dockd not reachable, retrying (is `npm run dockd` running?)');
    device = undefined;   // undefined = already said so; stay quiet until it comes back
    setTimeout(connect, 2000);
  });
}

function shutdown() {
  allNotesOff();
  out.closePort();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

connect();
