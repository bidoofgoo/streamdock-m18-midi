//
// StreamDock M18 -> MIDI bridge.
//
// A dockd client (see streamdock-m18/CLIENTS.md) that turns the 15 screen keys
// into MIDI notes on a virtual MIDI port, so a DAW like Cakewalk sees the dock
// as a MIDI keyboard.
//
//   aux left     octave down
//   aux middle   tap: next layout; hold: pick the key (C major, A minor, ...)
//   aux right    octave up
//
// With the rollover firmware (streamdock-m18-firmware) several keys can be held
// at once, with one hardware limit: while a key is held, the keys ABOVE it in
// the same column often don't register (no diodes in the matrix). So every
// layout below puts things you play together side by side, and stacks things
// you'd never want at the same time, like two neighbouring notes. On the stock
// firmware it all still works, one key at a time.
//
// Usage:
//   npm run dockd                 (in streamdock-m18, owns the device)
//   npm start                     (this, sends to the port named "StreamDock";
//                                  on macOS/Linux it creates that port itself)
//   npm start -- --key=Eb         (start in another key; --key=Am for A minor)
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
const HOLD_MS = 500;   // aux middle held this long opens the key picker

// ---- keys and scales --------------------------------------------------------
//
// A key is a home note plus major or minor. Every layout except the drums
// follows it, so picking "A minor" changes the chords, the scale and the
// pentatonic together.

const MODES = {
  // steps: semitones above the home note for the 7 notes of the scale.
  // pent: which of those 7 make the 5-note pentatonic scale.
  // names: how each home note is usually written in this mode (Db major but
  // C# minor), which decides whether the key is spelled with sharps or flats.
  major: {
    steps: [0, 2, 4, 5, 7, 9, 11], pent: [0, 1, 2, 4, 5],
    names: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  },
  minor: {
    steps: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 3, 4, 6],
    names: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
  },
};

const LETTERS = 'CDEFGAB';
const NATURAL = [0, 2, 4, 5, 7, 9, 11];   // semitones of C D E F G A B
const BLACK = [1, 3, 6, 8, 10];           // the black piano keys

const state = { layout: 0, key: 0, minor: false, octave: 3, picker: false };

const mode = () => MODES[state.minor ? 'minor' : 'major'];
const keyName = (key = state.key, minor = state.minor) =>
  MODES[minor ? 'minor' : 'major'].names[key] + (minor ? ' minor' : ' major');
const rootNote = () => 12 * (state.octave + 1) + state.key;

// Spells a note the way sheet music would in this key: in F major the fourth
// note is Bb, not A#, because each scale note gets its own letter.
function spell(note, degree) {
  const letter = (LETTERS.indexOf(mode().names[state.key][0]) + degree) % 7;
  const acc = ((note - NATURAL[letter]) % 12 + 18) % 12 - 6;   // -2 .. +2
  return {
    name: LETTERS[letter] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc)),
    octave: Math.floor((note - acc) / 12) - 1,
  };
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Notes outside the key: flats in flat keys, sharps otherwise.
function spellOutside(note) {
  const flats = mode().steps.some((s, d) => spell(state.key + s, d).name.includes('b'));
  return { name: (flats ? FLATS : SHARPS)[note % 12], octave: Math.floor(note / 12) - 1 };
}

// Step s of the scale, counting on past the octave: 0 is the home note, 7 the
// home note an octave up.
function scaleNote(step) {
  const degree = step % 7;
  const note = rootNote() + 12 * Math.floor(step / 7) + mode().steps[degree];
  return { note, degree, ...spell(note, degree) };
}

// ---- chords -----------------------------------------------------------------
//
// The chord on a scale note is that note plus the ones two and four scale
// steps up (every other note). Which of them are 3 or 4 semitones apart
// decides major, minor or diminished. Roman numerals give the chord's place
// in the key: upper case major, lower case minor, ° diminished.

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// What each chord does in the key, by scale degree: home, away, or tension
// that wants to go home. The same holds in minor (i, III and VI are home).
const FUNCTION = ['tonic', 'sub', 'tonic', 'sub', 'dominant', 'tonic', 'dominant'];
const FUNCTION_COLOR = { tonic: '#1d3f6e', sub: '#1f5a34', dominant: '#6e1d1d' };

function chord(step) {
  const [root, third, fifth] = [0, 2, 4].map(i => scaleNote(step + i));
  const quality = third.note - root.note === 4 ? 'maj'
    : fifth.note - root.note === 6 ? 'dim' : 'min';
  const roman = quality === 'maj' ? ROMAN[root.degree]
    : ROMAN[root.degree].toLowerCase() + (quality === 'dim' ? '°' : '');
  const suffix = { maj: '', min: 'm', dim: 'dim' }[quality];
  return { notes: [root.note, third.note, fifth.note], roman, name: root.name + suffix, degree: root.degree, octave: root.octave };
}

// ---- layouts ----------------------------------------------------------------
//
// Grid index 0 is top-left; below, `col` counts from the left and `row` from
// the bottom. Pitch rises from bottom-left.
//
// The column limit shapes all of them. Keys stacked in one column are things
// that clash (neighbouring notes, neighbouring chords, two hi-hats), so losing
// the upper one while the lower is held costs nothing musical. Keys side by
// side never interfere, and that is where the combinations live.

// General MIDI percussion, channel 10, top row first. One column per drum
// group, so what you hit together (kick, snare, hi-hat, crash) sits side by
// side, and a column only holds variants you'd hit one at a time.
const DRUMS = [
  [56, 'Cow bell'], [37, 'Rim'], [50, 'Tom Hi'], [44, 'HH Ped'], [53, 'Bell'],
  [35, 'Kick 2'], [39, 'Clap'], [47, 'Tom Md'], [46, 'HH Op'], [51, 'Ride'],
  [36, 'Kick'], [38, 'Snare'], [45, 'Tom Lo'], [42, 'HH Cl'], [49, 'Crash'],
];

const GREY = { color: '#b0b0b0', textColor: '#000000' };   // the home note or chord

const LAYOUTS = [
  {
    // Count up each column: I ii iii, IV V vi, vii° I ii, and so on, two
    // octaves' worth, so every chord is there low and high and none repeats
    // at the same pitch. Stacked chords are a step apart and share no notes,
    // the clashing kind; the four chords of pop (I V vi IV) sit in the first
    // two columns.
    name: 'Chords', channel: 0, ring: [180, 40, 200],
    face(col, row) {
      const c = chord(3 * col + row);
      const look = c.degree === 0 ? GREY : { color: FUNCTION_COLOR[FUNCTION[c.degree]], textColor: '#ffffff' };
      // a third line for the octave where dockd can draw one
      const label = multiline ? [c.roman, c.name, `oct ${c.octave}`].join('\n') : `${c.roman} ${c.name}`;
      return { notes: c.notes, label, ...look };
    },
  },
  {
    // Rows climb in thirds (every other scale note), and each row starts one
    // note above the row below. So any three keys side by side are a chord,
    // and each column is three neighbouring notes, the ones that clash.
    // A scale run zigzags: up the column, then on to the next column.
    name: 'Scale', channel: 0, ring: [30, 80, 220],
    face(col, row) {
      const n = scaleNote(2 * col + row);
      // home note grey; the other notes of the home chord (3rd and 5th) a
      // brighter blue, since a tune usually comes to rest on one of those
      const look = n.degree === 0 ? GREY
        : { color: n.degree === 2 || n.degree === 4 ? '#35609a' : '#1d3557', textColor: '#ffffff' };
      return { notes: [n.note], label: n.name + n.octave, ...look };
    },
  },
  {
    // Five notes per octave, one octave per row, so each column is one note
    // in three octaves. The pentatonic scale has no clashing neighbours,
    // which is why any combination sounds fine.
    name: 'Pentatonic', channel: 0, ring: [20, 180, 90],
    face(col, row) {
      const n = scaleNote(7 * row + mode().pent[col]);
      const look = n.degree === 0 ? GREY : { color: '#1d4f3a', textColor: '#ffffff' };
      return { notes: [n.note], label: n.name + n.octave, ...look };
    },
  },
  {
    // All 12 notes, three semitones per column: each column is three
    // neighbouring piano keys, and any two notes at least three semitones
    // apart are in different columns, so every chord fits. Notes outside the
    // key are dark.
    name: 'Chromatic', channel: 0, ring: [220, 150, 20],
    face(col, row) {
      const semis = 3 * col + row;
      const note = rootNote() + semis;
      const degree = mode().steps.indexOf(semis % 12);
      const n = degree < 0 ? spellOutside(note) : spell(note, degree);
      const look = degree === 0 ? GREY
        : degree > 0 ? { color: '#4a3a1d', textColor: '#ffffff' }
        : { color: '#141414', textColor: '#707070' };
      return { notes: [note], label: n.name + n.octave, ...look };
    },
  },
  {
    name: 'Drums', channel: 9, drums: true, ring: [200, 40, 20],
    face(col, row, index) {
      const [note, label] = DRUMS[index];
      return { notes: [note], label, color: '#5a1d1d', textColor: '#ffffff' };
    },
  },
];

// What a key plays and how it looks.
function keyFace(index) {
  const cols = 5, rows = 3;
  const col = index % cols;
  const row = rows - 1 - Math.floor(index / cols);   // 0 = bottom row
  return LAYOUTS[state.layout].face(col, row, index);
}

// ---- key picker ---------------------------------------------------------------
//
// Hold aux middle to open it, tap aux middle to close it. The 12 home notes in
// piano order (black keys dark), then major, minor, and the relative key:
// C major and A minor use the same seven notes, just with a different home.

const relative = () => state.minor
  ? { key: (state.key + 3) % 12, minor: false }
  : { key: (state.key + 9) % 12, minor: true };

function pickerFace(index) {
  const on = { color: '#e0b020', textColor: '#000000' };
  const off = { color: '#303030', textColor: '#ffffff' };
  if (index < 12) {
    const look = index === state.key ? on
      : BLACK.includes(index) ? { color: '#202020', textColor: '#ffffff' }
      : { color: '#d0d0d0', textColor: '#000000' };
    // a black key has two names; the one this key is spelled with goes on top
    const name = mode().names[index];
    const other = name === SHARPS[index] ? FLATS[index] : SHARPS[index];
    return { label: name === other ? name : `${name} ${other}`, ...look };
  }
  if (index === 12) return { label: 'major', ...(state.minor ? off : on) };
  if (index === 13) return { label: 'minor', ...(state.minor ? on : off) };
  const r = relative();
  return { label: `rel. ${MODES[r.minor ? 'minor' : 'major'].names[r.key]}${r.minor ? 'm' : ''}`, ...off };
}

function pick(index) {
  if (index < 12) state.key = index;
  else if (index === 12) state.minor = false;
  else if (index === 13) state.minor = true;
  else Object.assign(state, relative());
  console.log(`key: ${keyName()}`);
  paint();
}

// --key=Eb, --key=F#m, --key=A --minor
function parseKey(text, minor) {
  const m = /^([a-g])([#b]?)(m?)$/i.exec(String(text));
  if (!m) { console.error(`--key: can't read "${text}", staying in C major`); return; }
  const pc = (NATURAL[LETTERS.indexOf(m[1].toUpperCase())] + (m[2] === '#' ? 1 : m[2] === 'b' ? 11 : 0)) % 12;
  state.key = pc;
  state.minor = Boolean(m[3]) || Boolean(minor);
}
if (args.key !== undefined) parseKey(args.key, args.minor);
else if (args.minor) state.minor = true;

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

// Remember what each key actually sent, so a release after an octave or key
// change still turns off the right notes.
const held = new Map();   // key index -> { notes, channel }

function noteOn(index) {
  const notes = keyFace(index).notes.filter(n => n >= 0 && n <= 127);
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
let multiline = false;   // dockd draws "\n" in labels as lines (hello.features)
const send = o => sock?.writable && sock.write(JSON.stringify(o) + '\n');

function paint() {
  if (!device || device.state !== 'online') return;
  for (let i = 0; i < device.keys; i++) {
    const { label, color, textColor } = state.picker ? pickerFace(i) : keyFace(i);
    send({ cmd: 'key', index: i, label, color, textColor });
  }
  paintLeds(false);
}

function paintLeds(hit) {
  const ring = state.picker ? [224, 176, 32] : LAYOUTS[state.layout].ring;
  send({ cmd: 'led', zone: 'ring', color: hit ? [255, 255, 255] : ring });
  send({ cmd: 'led', zone: 'front', color: hit ? [255, 255, 255] : ring.map(c => c >> 2) });
}

function announce() {
  const layout = LAYOUTS[state.layout];
  const where = layout.drums ? '' : `, ${keyName()}, octave ${state.octave}`;
  console.log(`layout: ${layout.name}${where}`);
}

let middleTimer = null;
let middleHeld = false;   // true once the hold opened or closed the picker

function onKey({ index, state: down }) {
  if (index < AUX_LEFT) {
    if (state.picker) {
      if (down) pick(index);
    } else if (down) {
      noteOn(index);
      if (held.size === 1) paintLeds(true);
    } else {
      noteOff(index);
      if (held.size === 0) paintLeds(false);
    }
    return;
  }

  if (index === AUX_MIDDLE) {
    if (down) {
      middleHeld = false;
      middleTimer = setTimeout(() => {
        middleHeld = true;
        state.picker = !state.picker;
        if (!state.picker) announce();
        paint();
      }, HOLD_MS);
    } else {
      clearTimeout(middleTimer);
      if (middleHeld) return;
      if (state.picker) state.picker = false;
      else state.layout = (state.layout + 1) % LAYOUTS.length;
      announce();
      paint();
    }
    return;
  }

  if (!down || state.picker || LAYOUTS[state.layout].drums) return;
  const next = state.octave + (index === AUX_LEFT ? -1 : 1);
  if (next < 0 || next > 7) return;
  state.octave = next;
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
          multiline = (msg.features ?? []).includes('multilineLabels');
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
