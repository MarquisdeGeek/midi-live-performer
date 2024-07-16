const midi_info = require('midi-info');
const Chords = midi_info.Chords;

const qnDuration = midi_info.Constants.Pulses.DURATION_CROCHET;

// console.log(Chords)
function none(seq, chord, channel, bar, beat, pulse) {
    // NOP
}

// This fills in a single beat, with two bass notes, and
// a vamped chord
function basic(seq, chord, channel, bar, beat, pulse) {
    // console.log(bar, beat, pulse)

    // If we have a chord, then fill the next beat(s) with a bass note
    if (chord.length) {
        let rootPitch = chord[0];
        seq.qNote(0, channel, rootPitch,  120, qnDuration/2);
        seq.qNote(qnDuration/2, channel, rootPitch + (beat == 3 ? -5 : 0),  100, qnDuration/2);
    }

}


// A fast arpeggio, with a bar long pattern, filled in a per-beat basis
function arpeg(seq, chord, channel, bar, beat, pulse) {
    let pattern = [0,0,12,0,12,12,0,12, 0,0,12,0,12,12,0,12];

    //...then fill the next beat(s) with a bass note
    if (chord.length) {
        let rootPitch = chord[0];
        let startAt = 0;
        for(let i=0;i<4;++i) {
            startAt = seq.qNote(startAt, channel, rootPitch + pattern[beat*4 + i],  120, qnDuration/4);
        }
    }

}


// A slow piano arpeggio, filled in a per-beat basis
function piano(seq, chord, channel, bar, beat, pulse) {
    let majmin = Chords.isMajorChord(chord) ? 0 : -1;

    let pattern = [
        /* 0 */ [  { d: qnDuration/2, n: [0, 12], }, { d: qnDuration/2, n: [4+majmin], }, ],
        /* 1 */ [  { d: qnDuration, n: [7, 12], }, ],
        /* 2 */ [  { d: qnDuration/2, n: [0, 4+majmin], },  { d: qnDuration/2, n: [12], },],
        /* 3 */ [  { d: qnDuration/2, n: [0],},  { d: qnDuration/2, n: [4+majmin], }, ],
    ];

    //...then fill the next beat(s) with a bass note
    if (chord.length) {
        let rootPitch = chord[0];
        let startAt = 0;
        for(let i=0;i<pattern[beat].length;++i) { // consecutive notes
            for(let n=0;n<pattern[beat][i].n.length;++n) { // harmony notes
                startAt = seq.qNote(startAt, channel, rootPitch + pattern[beat][i].n[n],  120, pattern[beat][i].d);
            }
        }
    }

}


module.exports = [
    none,
    basic,
    arpeg,
    piano
];
