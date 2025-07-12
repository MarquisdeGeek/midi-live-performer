require('dotenv').config();

const readline = require('readline');
const midi = require('@julusian/midi');
const midi_info = require('midi-info');
const performer = require('midi-live-performer');


const internal = require('stream');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


// The global objects
let midiOutput;
let sequencer;


// Capture SIGINT to stop any outstanding notes
// This is also why we have a global sequencer object.
process.on('SIGINT', async function() {

    console.log("Sending notes off");
//    midiOutput = new midi.Output();
            // midiOutput.allNotesOff();

    sequencer.allNotesOff();
    await delay(100);

    console.log("Exitting");
    process.exit();
});



function listDevices() {
    // Input
    console.log(`MIDI input devices:`);
    const midiInput = new midi.Input();
    for(let i=0; i<midiInput.getPortCount(); ++i) {
        console.log(`${i} : ${midiInput.getPortName(i)}`);
    }

    console.log(``);

    // Output
    console.log(`MIDI output devices:`);
    const midiOutput = new midi.Output();
    for(let i=0; i<midiOutput.getPortCount(); ++i) {
        console.log(`${i} : ${midiOutput.getPortName(i)}`);
    }

    console.log(``);
    console.log(``);
}


function openPortByName(midiDevice, name, defaultIfFail) {
    for(let i=0; i<midiDevice.getPortCount(); ++i) {
        if (name === midiDevice.getPortName(i)) {
            midiDevice.openPort(i);
            return i;
        }
    }

    // We failed, so open the default
    midiDevice.openPort(defaultIfFail);

    return defaultIfFail;
}

    

function scoreInit(scorePart) {
    scorePart.parts.forEach((note) => {
        midiOutput.sendMessage([
            midi_info.Constants.Messages.SET_PARAMETER | note.channel,
            midi_info.Constants.Messages.cc.BANK_SELECT,
            note.bank
        ]);
        midiOutput.sendMessage(midi_info.Messages.makeSetProgram(note.channel, note.patch));
    });
}

function scoreStart(options, scorePart) {
    // Compute change
    // scorePart.shifting = {};
    scorePart.tickCount = scorePart.overTime * (1000 / options.interval);

    console.log(`Ready:`);
    // console.log(part);

    scorePart.parts.forEach((note) => {

        // Set range of pitch
        // 1. RPN, to indicate pitch bend
        midiOutput.sendMessage([
            midi_info.Constants.Messages.CONTROL_CHANGE | note.channel,
            0x65, 0 // MSB
        ]);
        midiOutput.sendMessage([
            midi_info.Constants.Messages.CONTROL_CHANGE | note.channel,
            0x64, 0
        ]);


        // // 2. Pitch bend amount
        const semitones = Math.abs(note.noteEnd - note.noteStart);
        midiOutput.sendMessage([
            midi_info.Constants.Messages.CONTROL_CHANGE | note.channel,
            0x06, semitones // +/-
        ]);
        midiOutput.sendMessage([
            midi_info.Constants.Messages.CONTROL_CHANGE | note.channel,
            0x26, 0 // cents
        ]);

        // 3. Nullify the RPN
        midiOutput.sendMessage([
            midi_info.Constants.Messages.CONTROL_CHANGE | note.channel,
            0x65, 127
        ]);
        midiOutput.sendMessage([
            midi_info.Constants.Messages.CONTROL_CHANGE | note.channel,
            0x64, 127
        ]);

        // Prepare the note state
        note.shifting = {
            cents: 0,
            delta: Math.floor(0x1fff / scorePart.tickCount)
        };

        if (note.noteEnd < note.noteStart) {
            note.shifting.delta *= -1;
        }
        
        // Force the pitch wheel to centre
        const value = 0x2000;
        const msg = [
            midi_info.Constants.Messages.SET_PITCHWHEEL | note.channel,
            (value & 0x7f), // LSB
            (value>>7) & 0x7f //MSB
        ];
        console.log(`${note.channel} : Pitch ${note.shifting.cents} to ${value}, msg=${msg}`)
        midiOutput.sendMessage(msg);

        // Play
        console.log(`On:`,note.channel, note.noteStart, 120);
        let rt = midiOutput.sendMessage(midi_info.Messages.makeNoteOn(note.channel, note.noteStart, 120));
        console.log(rt);
        // midiOutput.sendMessage(midi_info.Messages.makeNoteOn(note.channel, note.noteStart, 120));
    })
}

function scoreEnd(scorePart) {
    scorePart.parts.forEach((note) => {
        console.log(`Off:`,note.channel, note.noteStart, 120);
        midiOutput.sendMessage(midi_info.Messages.makeNoteOff(note.channel, note.noteStart));
    })
}


function startInterval(options) {
    let ival = setInterval(() => {
        const currentScorePart = options.score[options.scoreIndex];

        if (--currentScorePart.tickCount === 0) {
            scoreEnd(options.score[options.scoreIndex]);
            // midiOutput.sendMessage(midi_info.Messages.makeNoteOff(options.channel, options.noteStart));
            
            // ANy more score parts to play?
            if (++options.scoreIndex >= options.score.length) {
                console.log(`end..`);
                clearInterval(ival);
                process.exit(0);
                return;
            }

            scoreStart(options, options.score[options.scoreIndex]);

            return;
        }

        currentScorePart.parts.forEach((note) => {

            // bend it like ...
            note.shifting.cents += note.shifting.delta;

            const centre = 0x2000;
            let value = note.shifting.cents + centre;
            value = Math.min(value, 0x3fff);
            value = Math.max(value, 0);// 14-bit value

            const msg = [
                midi_info.Constants.Messages.SET_PITCHWHEEL | note.channel,
                (value & 0x7f), // LSB
                (value>>7) & 0x7f //MSB
            ];
            console.log(`${note.channel} : Pitch ${note.shifting.cents} to ${value}, msg=${msg}`)
            midiOutput.sendMessage(msg);
        });

    }, options.interval);

}

async function main() {

    // Output
    midiOutput = new midi.Output();
    openPortByName(midiOutput, process.env.MIDI_OUTPUT, 0);
    sequencer = new performer.Sequencer(midiOutput);

    
    const rootC = midi_info.Constants.Notes.C4;
    const options = {
        score:[
            {
                // As taken from https://imgur.com/harmonic-progression-of-vers-le-blanc-tape-mpmHQSq
                parts: [
                    {
                        channel: 0,
                        bank: 0,
                        patch: 48,
                        noteStart: rootC + midi_info.Constants.Notes.C,
                        noteEnd:   rootC + midi_info.Constants.Notes.E,
                    },
                    {
                        channel: 1,
                        bank: 0,
                        patch: 44,
                        noteStart: rootC + midi_info.Constants.Notes.A,
                        noteEnd:   rootC + midi_info.Constants.Notes.D,
                    },
                    {
                        channel: 2,
                        bank: 0,
                        patch: 103,
                        noteStart: rootC + midi_info.Constants.Notes.B,
                        noteEnd:   rootC + midi_info.Constants.Notes.F,
                    },
                ],
                overTime: 10 + 15*60// in seconds
            },
        ],
        //
        scoreIndex: 0,
        interval: 100, // in ms
    };

 
    // midiOutput.sendMessage(midi_info.Messages.makeNoteOn(options.channel, options.noteStart, 120));
    scoreInit(options.score[0]);
    scoreStart(options, options.score[0]);

    await delay(1000)

    startInterval(options);

}


listDevices();

main()

