# A music lesson on 15 keys

You don't need to know any music to play the dock. This page explains what the layouts are
doing, one idea at a time, with something to try on the dock after each. Start the bridge,
leave it in C major (the default) and read along.

## 1. Twelve notes, over and over

Western music uses twelve notes. On a piano they are the white and black keys from one C to
the next: C, C#, D, D#, E, F, F#, G, G#, A, A#, B. After B comes C again, just higher. That
distance, from a note to the same note higher up, is an **octave**. The number in a label like
`E3` says which octave: E4 is the same note as E3, one octave up.

> **Try:** the **Chromatic** layout (tap aux middle until the ring turns orange). Each column is
> three neighbouring piano keys, going up. The top-right key is the bottom-left one an octave up.
> Aux left and right move everything an octave.

## 2. Neighbours clash

Play two notes that are right next to each other, like C and C#. It sounds harsh: the two notes
rub against each other. Notes one or two steps apart **clash** (musicians say *dissonant*).
Notes further apart, like C and E or C and G, blend (*consonant*).

That is why the dock puts neighbouring notes **above each other**. With the rollover firmware,
a held key can hide the keys above it in its column. On this dock that costs you nothing,
because those are exactly the combinations you'd rarely want.

## 3. A key: seven notes and a home

Most songs don't use all twelve notes. They pick seven, and one of those seven feels like
**home**: the tune wants to end there. That choice of seven notes plus a home is the song's
**key**. "C major" means: home is C, and the seven notes are the white piano keys.

**Major** keys tend to sound bright or happy, **minor** keys darker or sad. Same idea, a
different pattern of steps between the seven notes.

> **Try:** the **Scale** layout (blue ring). Only the seven notes of C major are there, and the
> grey key is home. Play the bottom-left key, then the middle and top key of each column, left
> to right. That's the scale, do-re-mi. (The bottom row repeats notes from the top row, one
> column to the left.) Now play any tune and end on a grey key. It
> sounds finished. End on another key and it sounds like a question.
>
> The brighter blue keys are the other two notes of the home chord (see below). They are good
> places for a tune to rest too.

## 4. Chords are every other note

A **chord** is a few notes played together. The standard one takes a note of the key, skips
one, takes the next, skips one, takes the next: C, (D), E, (F), G gives the chord **C**.

The Scale layout is arranged for exactly this: each key's right-hand neighbour is the note two
steps up in the scale. So **any three keys side by side are a chord.**

```
Scale layout, C major

E3  G3  B3  D4  F4        three side by side:  C E G  = C major
D3  F3  A3  C4  E4                             D F A  = D minor
C3  E3  G3  B3  D4                             E G B  = E minor ...
```

Depending on the key you start on, the chord comes out **major** (bright), **minor** (dark) or,
once per key, **diminished** (tense and unstable).

> **Try:** hold three keys side by side in Scale (needs the rollover firmware). Then try three
> keys in one column, top key first: that's the clashing kind.

## 5. Chord numbers: I, IV, V...

Each of the seven notes of the key gets its own chord, so a key has seven chords. Musicians
number them by where they start: I is the chord on the home note, II on the second note, and so
on to VII. **Upper case** means major, **lower case** minor, and **°** diminished:

| | I | ii | iii | IV | V | vi | vii° |
|---|---|---|---|---|---|---|---|
| C major | C | Dm | Em | F | G | Am | Bdim |
| G major | G | Am | Bm | C | D | Em | F#dim |

Why numbers instead of names? Because songs are made of *patterns* of numbers. "Let It Be" goes
I, V, vi, IV. In C that's C, G, Am, F; in G it's G, D, Em, C. Same song, same numbers, just in
another key.

The **Chords** layout (purple ring) puts one chord on every key, labelled with its number and
name. Count up each column: I, ii, iii in the first, IV, V, vi in the second, and on through
two octaves. Every chord is there twice, low and high (I three times), and pitch rises from
bottom-left to top-right.

```
Chords layout, C major

iii Em   vi Am   ii Dm      V G      I C
ii Dm    V G     I C        IV F     vii° Bdim
I C      IV F    vii° Bdim  iii Em   vi Am
```

Chords stacked in a column are neighbours in the key. They share no notes, so they clash when
held together: the same rule as for single notes (section 2).

> **Try:** I, V, vi, IV, over and over: bottom-left, then up the second column (V, vi), then
> the bottom of the second column. That's the famous "four chords" of pop, under hundreds of songs. Some others:
>
> - I, vi, IV, V: the 1950s doo-wop progression.
> - vi, IV, I, V: the same four, starting on the sad one.
> - ii, V, I: the jazz ending.
> - I I I I, IV IV I I, V IV I V: the 12-bar blues, one chord per bar.

## 6. Home, away and tension

The colours on the Chords layout say what a chord *does*:

- **Grey and blue (home):** I, and iii and vi, which share two notes with it. Restful.
- **Green (away):** ii and IV. Moving somewhere, not urgent.
- **Red (tension):** V and vii°. They want to go home to I.

Most songs wander from home to away to tension and back home.

> **Try:** play I, IV, V, and stop. It feels unfinished, like a sentence without its last word.
> Now play I. That landing is called a **cadence**.

## 7. Picking a key

**Hold aux middle** for half a second and the keys become the key picker: the twelve home notes
in piano order (black piano keys dark), then **major** and **minor**. Tap one or two, then tap
aux middle to go back. Chords, Scale, Pentatonic and Chromatic all follow.

The last key, **rel.**, jumps to the **relative** key. C major and A minor use exactly the same
seven notes; only the home differs. So minor isn't a different set of notes so much as a
different place to call home.

> **Try:** pick A minor. The Chords layout has the same chords as in C major, in new positions,
> and the grey home chord is now Am, bottom-left. Play i, VI, III, VII (bottom-left, top row
> second and first, bottom middle): the classic minor-key version of the four chords.
>
> Then pick G, D or E major and play I, V, vi, IV again at the same positions. Same song, higher
> or lower. That's why the numbers matter more than the names.

A note on minor: songs in a minor key often swap v for a major V, because a major chord pulls
home harder. The dock plays the plain minor version. In A minor, that major V is E, which needs
a G#: find it on the Chromatic layout.

## 8. Two chords at once

Two chords whose numbers are two apart (I and iii, vi and I) share two notes. Hold both and you
get four different notes, a richer chord. In C major, on keys in different columns:

- I + iii (centre + bottom fourth) = C, E, G, B: **Cmaj7**, dreamy.
- vi + I (top second + centre) = A, C, E, G: **Am7**, soft.
- V + vii° (middle second + bottom middle) = G, B, D, F: **G7**, the tensest way to ask for home.

Every chord is on the grid twice, so if a pair lands in one column, use the other copy, or press
the upper key first.

## 9. Pentatonic: no wrong notes

The **Pentatonic** layout (green ring) keeps five of the seven notes, and leaves out the two
that clash with their neighbours. What's left sounds good in any combination and any order.
Each row is the same five notes, one octave higher than the row below.

> **Try:** in your DAW, record a few bars on the Chords layout, loop it, switch to Pentatonic and
> play anything over it. Blues and rock guitar solos are mostly the minor pentatonic scale:
> pick A minor and you have the classic one.

## 10. The notes outside the key

Back on the **Chromatic** layout, the dark keys are the five notes outside the key. They're not
forbidden. Used briefly, on the way from one key note to another, they add colour and tension.
Holding one over a chord usually sounds wrong, which is a good way to hear what "in key" means.

## Why the names sometimes look odd

The dock spells notes the way sheet music does: every letter once per key. In F major the
fourth note is **Bb**, not A#, because there's already an A. In F# major the seventh note is
**E#**. That's the same piano key as F, but F# is already taken. It's the same sound either
way; only the name changes.
