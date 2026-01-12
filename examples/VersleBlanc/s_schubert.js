const midi_info = require('midi-info');
const rootC1 = midi_info.Constants.Notes.C4;
const rootC2 = midi_info.Constants.Notes.C5;
const rootC3 = midi_info.Constants.Notes.C4;
const chordDuration = 3 + 5*60// in seconds
const preWait = 2000;
const postWait = 2000;

// Schubert loop
// Dm-F-Am-C-Cm-Eb-Gm-Bb-Dm

const score = {
    score: [
            {
                name: "Dm-F",
                parts: [
                    {
                        channel: 0,
                        bank: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.D,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.C,
                    },
                    {
                        channel: 1,
                        bank: 0,
                        noteStart: rootC2 + midi_info.Constants.Notes.F,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.F,
                    },
                    {
                        channel: 2,
                        bank: 0,
                        noteStart: rootC3 + midi_info.Constants.Notes.A,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.A,
                    },
                ]
            },
            {
                name: "F-Am",
                parts: [
                    {
                        channel: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.C,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.C,
                    },
                    {
                        channel: 1,
                        noteStart: rootC2 + midi_info.Constants.Notes.F,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.E,
                    },
                    {
                        channel: 2,
                        noteStart: rootC3 + midi_info.Constants.Notes.A,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.A,
                    },
                ],
            },
            {
                name: "Am-C",
                parts: [
                    {
                        channel: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.C,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.C,
                    },
                    {
                        channel: 1,
                        noteStart: rootC2 + midi_info.Constants.Notes.E,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.E,
                    },
                    {
                        channel: 2,
                        noteStart: rootC3 + midi_info.Constants.Notes.A,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.G,
                    },
                ],
            },
            {
                name: "C-Cm",
                parts: [
                    {
                        channel: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.C,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.C,
                    },
                    {
                        channel: 1,
                        noteStart: rootC2 + midi_info.Constants.Notes.E,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.E_FLAT,
                    },
                    {
                        channel: 2,
                        noteStart: rootC3 + midi_info.Constants.Notes.G,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.G,
                    },
                ],
            },
            {
                name: "Cm-Eb",
                parts: [
                    {
                        channel: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.C,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.B_FLAT - 12,
                    },
                    {
                        channel: 1,
                        noteStart: rootC2 + midi_info.Constants.Notes.E_FLAT,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.E_FLAT,
                    },
                    {
                        channel: 2,
                        noteStart: rootC3 + midi_info.Constants.Notes.G,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.G,
                    },
                ],
            },
            {
                name: "Eb-Gm",
                parts: [
                    {
                        channel: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.B_FLAT - 12,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.B_FLAT - 12,
                    },
                    {
                        channel: 1,
                        noteStart: rootC2 + midi_info.Constants.Notes.E_FLAT,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.D,
                    },
                    {
                        channel: 2,
                        noteStart: rootC3 + midi_info.Constants.Notes.G,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.G,
                    },
                ],
            },
            { 
                name: "Gm-Bb",
                parts: [
                    {
                        channel: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.B_FLAT - 12,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.B_FLAT - 12,
                    },
                    {
                        channel: 1,
                        noteStart: rootC2 + midi_info.Constants.Notes.D,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.D,
                    },
                    {
                        channel: 2,
                        noteStart: rootC3 + midi_info.Constants.Notes.G,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.F,
                    },
                ],
            },
            {
                name: "Bb-Dm",
                parts: [
                    {
                        channel: 0,
                        noteStart: rootC1 + midi_info.Constants.Notes.B_FLAT - 12,
                        noteEnd:   rootC1 + midi_info.Constants.Notes.A, // should be -12, but I prefer it this way :)
                    },
                    {
                        channel: 1,
                        noteStart: rootC2 + midi_info.Constants.Notes.D,
                        noteEnd:   rootC2 + midi_info.Constants.Notes.D,
                    },
                    {
                        channel: 2,
                        noteStart: rootC3 + midi_info.Constants.Notes.F,
                        noteEnd:   rootC3 + midi_info.Constants.Notes.F,
                    },
                ],
            },

        ],
};


score.score.forEach((part) => {
    part.preWait = preWait;
    part.postWait = postWait;
    part.overTime = chordDuration;
});

score.score[score.score.length - 1].postWait *= 4;
score.oneTouchPerformance = true;
score.forcePitchWheelRange= 12;

const orchestration1 = [
    {b:0,p:71},//clarinet
    {b:0,p:51},//synth strings
    {b:0,p:40},//violin
];
const orchestration2 = [
    {b:0,p:103},//star theme
    {b:0,p:94},//halo
    {b:0,p:85},//solo vox
];
//blofeld
const orchestration3 = [
    {b:3,p:28},
    {b:6,p:57},
    {b:3,p:105},
];
const orchestration4 = [
    {b:1,p:28},
    {b:2,p:117},
    {b:5,p:36},
];
// b:1,p:95 => 181 = sweep pad (121, 0, 96)
// b:2,p:60 => 130 = french horn (121 0 61)
// 3,p:59 => 127 = mutedtrumpet (121 0 60)
// 1,159=>254 =- machine gun (121, 1, -)
const orchestrationNull = [
    {b:undefined,p:undefined,v:120}, // used 001 jp8strings1, but might prefer metal pad 188 (msb 95, lsb 65, pc=60)
    {b:0,p:49,v:90}, // string (17 was organ)
    {b:0,p:48,v:90},
];
orchestrationNull.forEach((s,i) => {score.score[0].parts[i].patch = s.p,score.score[0].parts[i].bank = s.b,score.score[0].parts[i].volume = s.v})

// For P16
// orchestration5.forEach((s,i) => {score.score[0].parts[i].patch = s.p,score.score[0].parts[i].bank = s.b,score.score[0].parts[i].channel = i})


module.exports = score;
