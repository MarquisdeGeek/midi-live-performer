const midi_info = require('midi-info');

const qnDuration = midi_info.Constants.Pulses.DURATION_CROCHET;
console.log(`qnDuration = ${qnDuration}`)
module.exports = [
    {
        name: "off",
        data: [
            { // original sound
                pitch:   0,     // pitch offset of original note
                volume:  1,     // fraction of original volume
                atTime:  0      // delay
            },
        ]
    },

    // 1
    {
        name: "basic",
        data: [
            { // original sound
                pitch:   0,     // pitch offset of original note
                volume:  1,     // fraction of original volume
                atTime:  0      // delay
            },
            { // one basic echo
                pitch:   0,
                volume:  1.5,
                atTime:  qnDuration
            },
        ]
    },

    // 2 - with an example of pitch change
    {
        name: "linear",
        data: [
            {
                pitch:  12,
                volume:  1,
                atTime:  0
            },
            {
                pitch:   0,
                volume:  1.2,
                atTime:  1*qnDuration
            },
            {
                pitch:   0,
                volume:  1.8,
                atTime:  2*qnDuration
            },
            {
                pitch:    0,
                volume:  2.1,
                atTime:  3*qnDuration
            },
        ]
    },

    // 3 - another example of pitch change
    {
        name: "power5",
        data: [
            {
                pitch:   0,
                volume:  1,
                atTime:  0
            },
            {
                pitch:   7,
                volume:  1.5,
                atTime:  1*qnDuration/4
            },
            {
                pitch:   7,
                volume:  2,
                atTime:  2*qnDuration/4
            },
            {
                pitch:   0,
                volume:  3,
                atTime:  3*qnDuration/4
            },
            {
                pitch:   12,
                volume:  4,
                atTime:  4*qnDuration/4
            },
            {
                pitch:   7,
                volume:  5,
                atTime:  5*qnDuration/4
            },
        ]
    },

];
