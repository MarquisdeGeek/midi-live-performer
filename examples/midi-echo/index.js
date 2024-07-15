const readline = require('readline');
const midi = require('@julusian/midi');
const midi_info = require('midi-info');
const performer = require('midi-live-performer');

const echoSettings = require('./settings');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


// The global sequencer object
let sequencer;

// Which echo setting?
let echoUnit = 1;
let echoPowered = true;

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
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

console.log("Commands:");
console.log("  on : switch echo on");
console.log("  off : switch echo off");
console.log(`  [1-${echoSettings.length - 1}] : use echo setting N`);

  
rl.on('line', (line) => {
    switch(line) {
        case 'on':
            echoPowered = true;
            console.log(`Echo now ON, using setting ${echoUnit}`);
            break;

        case 'off':
            echoPowered = false;
            console.log("Echo now OFF");
            break;

        default:
            let newUnit = parseInt(line, 10);

            if (newUnit < 1 || newUnit >= echoSettings.length || isNaN(newUnit)) {
                console.log(`Echo setting ${newUnit} doesn't exist.`);
            } else {
                echoUnit = newUnit;
                console.log(`Echo switched to setting ${echoUnit}`);
            }
            break;
    }

});



async function main() {
    
    // Input, from the last device (usually an external synth)
    const midiInput = new midi.Input();
    midiInput.openPort(midiInput.getPortCount() - 1);


    // Output
    const midiOutput = new midi.Output();
    midiOutput.openPort(midiOutput.getPortCount() - 2); // my output synth, ymmv
    sequencer = new performer.Sequencer(midiOutput);


    // A new keyboard object, used here to parse the input into text
    const keys = new performer.Keyboard();

    
    // Because the echo will usually need to re-trigger the note we've just played
    // we turn off the local control, which prevents the synth from playing that note
    // so we can do so with impunity.
    sequencer.sendCC(0, midi_info.Constants.Messages.cc.LOCAL_CONTROL, 0);


    // Inner loop
    const inputStream = midi.createReadStream(midiInput)
    inputStream.on("data", function (chunk) {
        const result = keys.onData(chunk);

        result.forEach((r) => {
            const echoParams = echoSettings[echoPowered ? echoUnit : 0].data;
            //
            if (r.msg == midi_info.Constants.Messages.NOTE_ON) {
                echoParams.forEach((echo) => {
                    sequencer.qNoteOn(r.channel, r.pitch + echo.pitch, r.volume / echo.volume,  echo.atTime);
                });

            } else if (r.msg == midi_info.Constants.Messages.NOTE_OFF) {
                echoParams.forEach((echo) => {
                    sequencer.qNoteOff(r.channel, r.pitch + echo.pitch,  echo.atTime);
                });
            }
      }); // hceArof
    });
}


main()

