require('dotenv').config();

const readline = require('readline');
const midi = require('@julusian/midi');
const midi_info = require('midi-info');
const performer = require('midi-live-performer');
const chordIdentifier = require('chord-identifier');


const Guitar = require('./guitar').Guitar;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// The global sequencer object
let sequencer;

// State of instrument
let bestChord = [];
let keySplit = 60;      // this note, and those above it, are played directly as-is. Those below are considered chords


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


async function prepareUI() {
    console.log("Notes below the split generate the chord. White notes above strum downwards. Black notes strum up.");
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


async function main() {

    // Input, from a named device in the .env file
    const midiInput = new midi.Input();
    openPortByName(midiInput, process.env.STRUMMER_MIDI_INPUT, 0);

    midiInputSend = new midi.Output();
    openPortByName(midiInputSend, process.env.STRUMMER_MIDI_INPUT, 0);
    midiInputSend.sendMessage(midi_info.Messages.makeLocalControl(0, false));

    // Output
    const midiOutput = new midi.Output();
    openPortByName(midiOutput, process.env.STRUMMER_MIDI_OUTPUT, 0);


    // Standard sequencer object
    sequencer = new performer.Sequencer(midiOutput);


    // A new keyboard object, used here to parse the input into text
    const keys = new performer.Keyboard();



    // Inner loop
    const inputStream = midi.createReadStream(midiInput);
    inputStream.on("data", function (chunk) {
        const result = keys.onData(chunk);

        result.forEach((r) => {
            if (r.msg === midi_info.Constants.Messages.NOTE_ON) {
                if (r.pitch >= keySplit) {

                    // Best chord from the other notes?
                    bestChord = midi_info.Chords.guessChord(keys, r.channel, keySplit);

                    // sequencer.playNoteOn(r.channel, r.pitch, r.volume);
                    let guitar = new Guitar();
                    let notesInChord = bestChord.map((n) => midi_info.Names.getNoteFromMIDI(n));
                    let noteInBass = notesInChord[0];
                    let identifiedAs = chordIdentifier.getAllChordsFromNotes(notesInChord, noteInBass);

                    let strumNotes = [];
                    let strumSpeed = 30;
                    let octaveOffset = Math.floor((r.pitch - keySplit) / 12) * 12;

                    if (typeof identifiedAs[0] === typeof undefined) {
                        // Just strum whatever notes we have
                        strumNotes = bestChord;
                    } else {
                        strumNotes = guitar.generateChordNamed(identifiedAs[0]);
                    }

                    // Map fretboard positions to MIDI notes
                    let stringIdx = -1;
                    let midiNotes = strumNotes.map((n) => {
                        ++stringIdx;

                        // String not played
                        if (typeof n === typeof undefined) {
                            return n;
                        }
                        //
                        return guitar.getStringPitch(stringIdx, n);
                    });


                    // Strum order?
                    if (midi_info.Notes.isNoteBlack(r.pitch)) {
                        midiNotes = midiNotes.reverse();
                    }


                    // In a different register?
                    midiNotes = midiNotes.map((midiNote) => {
                        // String not played
                        if (typeof midiNote === typeof undefined) {
                            return;
                        }
                        return midiNote + octaveOffset;
                    });
                    

                    // Play, with temporal gaps
                    let atTime = 0;
                    midiNotes.forEach((midiNote) => {
                        // String not played
                        if (typeof midiNote === typeof undefined) {
                            return;
                        }
                        //
                        sequencer.qNote(atTime, 0, midiNote, 100,  384/4);
                        atTime += strumSpeed;
                    })
                    //
                }


            }
      }); // hceArof
    });
}


listDevices();

prepareUI();

main()

