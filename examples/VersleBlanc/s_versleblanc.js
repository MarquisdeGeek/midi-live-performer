const midi_info = require('midi-info');
const rootC = midi_info.Constants.Notes.C4;

module.exports = {
    oneTouchPerformance: false,
    forcePitchWheelRange: undefined,

    score: [
            {
                // As taken from https://imgur.com/harmonic-progression-of-vers-le-blanc-tape-mpmHQSq
                parts: [
                    {
                        channel: 0,
                        bank: 2,
                        patch: 12,
                        noteStart: rootC + midi_info.Constants.Notes.C,
                        noteEnd:   rootC + midi_info.Constants.Notes.E,
                    },
                    {
                        channel: 1,
                        bank: 3,
                        patch: 48,
                        noteStart: rootC + midi_info.Constants.Notes.A,
                        noteEnd:   rootC + midi_info.Constants.Notes.D,
                    },
                    {
                        channel: 2,
                        bank: 3,
                        patch: 103,
                        noteStart: rootC + midi_info.Constants.Notes.B,
                        noteEnd:   rootC + midi_info.Constants.Notes.F,
                    },
                ],
                preWait: 2000, // in ms
                postWait: 2000, // in ms
                overTime: 10 + 0*60// in seconds
            }
        ],

};
