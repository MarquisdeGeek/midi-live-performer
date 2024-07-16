const midi_info = require('midi-info');

const qnDuration = midi_info.Constants.Pulses.DURATION_CROCHET;

function none(seq, chord, channel, bar, beat, pulse) {
    // NOP
}


// This fills in a single beat, with two bass notes, and
// a vamped chord
function fourToFloor(seq, chord, channel, bar, beat, pulse) {
    seq.qNote(0, channel, midi_info.Constants.Drums.ACOUSTIC_BASS_DRUM,  100, qnDuration/8);
}


function fourToFloorWithHats(seq, chord, channel, bar, beat, pulse) {

    seq.qNote(0, channel, midi_info.Constants.Drums.ACOUSTIC_BASS_DRUM,  beat === 0 ? 120 : 100, qnDuration/8);

    let startAt = 0;
    for(let hh=0;hh<4;++hh) {
        startAt = seq.qNote(startAt, channel, hh==2 ? midi_info.Constants.Drums.OPEN_HI_HAT : midi_info.Constants.Drums.CLOSED_HI_HAT,  80, qnDuration/4);
    }
}


function stdRock(seq, chord, channel, bar, beat, pulse) {

    if (beat === 0 || beat === 2) {
        seq.qNote(0, channel, midi_info.Constants.Drums.ACOUSTIC_BASS_DRUM,  (beat===0) ? 110 : 80, qnDuration/8);
    }

    if (beat === 1 || beat === 3) {
        seq.qNote(0, channel, midi_info.Constants.Drums.ACOUSTIC_SNARE,  80, qnDuration/8);
    }

    let startAt = 0;
    for(let hh=0;hh<2;++hh) {
        startAt = seq.qNote(startAt, channel, midi_info.Constants.Drums.CLOSED_HI_HAT,  80, qnDuration/2);
    }
}


module.exports = [
    none,
    fourToFloor,
    fourToFloorWithHats,
    stdRock
];
