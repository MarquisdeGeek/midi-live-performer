require('dotenv').config();

const midi = require('@julusian/midi');
const midi_info = require('midi-info');
const performer = require('midi-live-performer');
const scoreVersleBlanc = require('./s_versleblanc');
const scoreSchubertLoop = require('./s_schubert');


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


// The global objects
let midiOutput;
let sequencer;


// Capture SIGINT to stop any outstanding notes
// This is also why we have a global sequencer object.
process.on('SIGINT', async function() {

    console.log("Sending notes off");

    sequencer.allNotesOff();
    await delay(100);

    console.log("Exitting");
    process.exit();
});


function log(msg) {
    console.log(msg);
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

    
async function scoreInit(scorePart) {
    scorePart.parts.forEach((note) => {
        if (typeof note.bank !== typeof undefined) {
            midiOutput.sendMessage([
                midi_info.Constants.Messages.SET_PARAMETER | note.channel,
                midi_info.Constants.Messages.cc.BANK_SELECT,
                note.bank
            ]);
        }

        if (typeof note.patch !== typeof undefined) {
            midiOutput.sendMessage(midi_info.Messages.makeSetProgram(note.channel, note.patch));
        }
    });
}


async function scoreStart(options, scorePart) {

    // Compute time counter
    scorePart.tickCount = 0;
    scorePart.tickMax = scorePart.overTime * (1000 / options.interval);
   
    log(`Starting: ${scorePart.name ? scorePart.name : ""}`);
    
    

    if (options.oneTouchPerformance && options.oneTouchStarted) {
        return;
    }

    // Prepare the global state
    options.channels = [];
    options.oneTouchStarted = true;

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
        let semitones = Math.abs(note.noteEnd - note.noteStart);
        if (typeof options.forcePitchWheelRange !== typeof undefined) {
            semitones = options.forcePitchWheelRange;
        }

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
            delta: Math.floor(0x1fff / scorePart.tickMax)
        };

        if (note.noteEnd < note.noteStart) {
            note.shifting.delta *= -1;
        }
        
        // Force the pitch wheel to centre
        midiOutput.sendMessage(midi_info.Messages.makeSetPitchWheel(note.channel, 0x2000));

        // Set channel state
        options.channels[note.channel] = {
            channel: note.channel,
            pitchWheelStart: note.noteStart,
            pitchWheelRange: semitones,
            lastNotePlayed: note.noteStart
        };

        // Play
        console.log(`On:`,note.channel, note.noteStart, 120);
        midiOutput.sendMessage(midi_info.Messages.makeNoteOn(note.channel, note.noteStart, 120));
    });

    //
    if (typeof scorePart.preWait !== typeof undefined) {
        log(`Pre-wait : ${scorePart.preWait}`);
        await delay(scorePart.preWait);
    }
}

function scoreEnd(options) {
    options.channels.forEach((channel) => {
        console.log(`Off:`,channel.channel, channel.lastNotePlayed, 120);

        midiOutput.sendMessage(midi_info.Messages.makeNoteOff(channel.channel, channel.lastNotePlayed));
    });
}


function startInterval(options) {
    let ival = setInterval(async () => {
        const currentScorePart = options.score[options.scoreIndex];

        if (++currentScorePart.tickCount > currentScorePart.tickMax) {

            if (typeof currentScorePart.postWait !== typeof undefined) {
                log(`Post-wait : ${currentScorePart.postWait}`);
                clearInterval(ival);
                await delay(currentScorePart.postWait);
                startInterval(options);
            }

            // Only stop the notes at the end (or if options say so)
            if (!options.oneTouchPerformance || options.scoreIndex+1 >= options.score.length) {
                scoreEnd(options);
            } else {
                log("End not done")
            }
            
            
            // Any more score parts to play?
            if (++options.scoreIndex >= options.score.length) {
                log(`Exit..`);
                clearInterval(ival);
                process.exit(0);
                return;
            }

            await scoreStart(options, options.score[options.scoreIndex]);

            return;
        }

        currentScorePart.parts.forEach((note) => {

            const centre = 0x2000;

            const percentThrough = currentScorePart.tickCount / currentScorePart.tickMax;
            const baseSemi = note.noteStart - options.channels[note.channel].pitchWheelStart;
            const semiInRange = note.noteEnd - note.noteStart;

            const fractionalSemi = baseSemi + semiInRange * percentThrough
            const wheelTo = fractionalSemi / options.channels[note.channel].pitchWheelRange;

            let value = wheelTo * 0x1fff;
            value += centre;
            value = Math.round(value);

            midiOutput.sendMessage(midi_info.Messages.makeSetPitchWheel(note.channel, value));

            // log(`${note.channel} : Pitch to ${value}, msg=${midi_info.Messages.makeSetPitchWheel(note.channel, value)}`)
        });

    }, options.interval);

}

async function main() {

    // Output
    midiOutput = new midi.Output();
    openPortByName(midiOutput, process.env.MIDI_OUTPUT, 0);
    sequencer = new performer.Sequencer(midiOutput);

    const useScore = scoreSchubertLoop;
    // const useScore = scoreVersleBlanc;
    const options = {
        score: useScore.score,
        oneTouchPerformance: useScore.oneTouchPerformance,
        forcePitchWheelRange: useScore.forcePitchWheelRange,
        //
        scoreIndex: 0,
        interval: 100, // in ms
    };

 
    await scoreInit(options.score[0]);
    await scoreStart(options, options.score[0]);

    startInterval(options);

}


listDevices();

main()

