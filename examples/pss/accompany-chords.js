const midi_info = require('midi-info');

const qnDuration = midi_info.Constants.Pulses.DURATION_CROCHET;


function none(seq, chord, channel, bar, beat, pulse) {
    // NOP
}


// This fills in a single beat, with two bass notes, and
// a vamped chord
function backBeat(seq, chord, channel, bar, beat, pulse) {

    //...and add a chord on beats 2 and 4
    if (beat === 1 || beat === 3) {
        for(let i=0;i<chord.length;++i) {
            seq.qNote(0, channel, chord[i] + 12,  80, qnDuration/8);
        }
    }

}


function asStart(seq, chord, channel, bar, beat, pulse) {

    //...and add a chord only at the start of the bar
    if (beat === 0) {
        for(let i=0;i<chord.length;++i) {
            seq.qNote(0, channel, chord[i] + 12,  80, qnDuration*2);
        }
    }

}


module.exports = [
    none,
    backBeat,
    asStart
];
