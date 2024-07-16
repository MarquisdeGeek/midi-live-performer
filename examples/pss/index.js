const readline = require('readline');
const midi = require('@julusian/midi');
const midi_info = require('midi-info');
const performer = require('midi-live-performer');

const accompanyBass = require('./accompany-bass')
const accompanyChords = require('./accompany-chords')
const accompanyDrums = require('./accompany-drums')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// The global sequencer object
let sequencer;

// State of instrument
let bestChord = [];
let keySplit = 60;      // this note, and those above it, are played directly as-is. Those below are considered chords
let fillAccompaniment = {
    bass: 1,
    chords: 1,
    drums: 1,
};


// Capture SIGINT to stop any outstanding notes
// This is also why we have a global sequencer object.
process.on('SIGINT', async function() {
    console.log("Caught interrupt signal, stopping sequence");
    sequencer.stopSequence();
    sequencer.sendCC(0, midi_info.Constants.Messages.cc.LOCAL_CONTROL, 1);

    console.log("Sending notes off");
    sequencer.allNotesOff();
    await delay(100);

    console.log("Exitting");
    process.exit();
});


// A basic interface to change the echo settings
async function prepareUI() {
    console.log("Commands:");
    console.log(`  b[0-${accompanyBass.length - 1}] : use bass pattern N - 0 for off`);
    console.log(`  c[0-${accompanyChords.length - 1}] : use chord pattern N - 0 for off`);
    console.log(`  d[0-${accompanyDrums.length - 1}] : use drum pattern N - 0 for off`);
    console.log(`  ? : review current settings`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });


    rl.on('line', (line) => {
        let value = parseInt(line.substring(1), 10);
        switch(line[0]) {
            case 'b':
                if (value < 0 || value >= accompanyBass.length || isNaN(value)) {
                    console.log(`Bass part ${value} doesn't exist.`);
                } else {
                    fillAccompaniment.bass = value;
                    console.log(`Bass part switched to ${value}`);
                }
            break;

            case 'c':
                if (value < 0 || value >= accompanyChords.length || isNaN(value)) {
                    console.log(`Chord part ${value} doesn't exist.`);
                } else {
                    fillAccompaniment.chords = value;
                    console.log(`Chord part switched to ${value}`);
                }
                break;

            case 'd':
                if (value < 0 || value >= accompanyDrums.length || isNaN(value)) {
                    console.log(`Drum part ${value} doesn't exist.`);
                } else {
                    fillAccompaniment.drums = value;
                    console.log(`Drum part switched to ${value}`);
                }
                break;

            case '?':
                console.log(`Bass: ${fillAccompaniment.bass}  Chords: ${fillAccompaniment.chords}   Drums: ${fillAccompaniment.drums}`);
                break;
        }
    });

}

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


async function main() {

    // Input, from the last device (usually an external synth)
    const midiInput = new midi.Input();
    midiInput.openPort(midiInput.getPortCount() - 1);


    // Output
    const midiOutput = new midi.Output();
    midiOutput.openPort(midiOutput.getPortCount() - 1); // my output synth, ymmv
    sequencer = new performer.Sequencer(midiOutput);


    // A new keyboard object, used here to parse the input into text
    const keys = new performer.Keyboard();

    sequencer.sendCC(0, midi_info.Constants.Messages.cc.LOCAL_CONTROL, 0);

    sequencer.onBeat((bar, beat, pulse) => {
        // Clear rest of notes on this channel...
        // (this is moderately safe, since we only fill a single quarter note's worth of data)
        sequencer.qClear(0);
        sequencer.qClear(9);

        accompanyBass[fillAccompaniment.bass](sequencer, bestChord, 0, bar, beat, pulse);
        accompanyChords[fillAccompaniment.chords](sequencer, bestChord, 0, bar, beat, pulse);
        accompanyDrums[fillAccompaniment.drums](sequencer, bestChord, 9, bar, beat, pulse);
    }); // beats are [0,1,2,3] so 3 would be the 4th beat of a 4/4 bar. Leaving blank means every beat.

    // Inner loop
    const inputStream = midi.createReadStream(midiInput)
    inputStream.on("data", function (chunk) {
        const result = keys.onData(chunk);

        result.forEach((r) => {
            if (r.msg == midi_info.Constants.Messages.NOTE_ON) {
                if (r.pitch >= keySplit) {
                    sequencer.playNoteOn(r.channel, r.pitch, r.volume);
                } else {
                    bestChord = midi_info.Chords.guessChord(keys, r.channel, keySplit);
                }
               
            } else if (r.msg == midi_info.Constants.Messages.NOTE_OFF) {
                if (r.pitch >= keySplit) {
                    sequencer.playNoteOff(r.channel, r.pitch, r.volume);
                } else {
                    bestChord = midi_info.Chords.guessChord(keys, r.channel, keySplit);
                }

            }
      }); // hceArof
    });
}


listDevices();

prepareUI();

main()

