require('dotenv').config();

const readline = require('readline');
const midi = require('@julusian/midi');
const midi_info = require('midi-info');
const performer = require('midi-live-performer');


const Looper = require('./looper').Looper;
const Exporter = require('./exporter');
const Importer = require('./importer');
const chord_shifter = require('./chord_shifter');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


// The global sequencer object
let sequencer;
let looper;
let midiInputSend;
let shifter;

// State of instrument
let settings = {
    octaveShift:    0,
    passThrough:    false,
    eraseLoop:      false,
    quantize:       96,
    barCount:       1,
    soloMode:       false,
    ppqn:           midi_info.Constants.Pulses.DURATION_CROCHET,
    //
    keySplitControlStart: 36, // One octave for channel selection, and commands
    keySplitControlEnd:   60, // One beyond last control key
    //
    getTimeSinceBarSectionStart: function () {
        let timeSinceBarSectionStart = sequencer.getTimeSinceBarSectionStart(settings.barCount);
        // We may, later, use alternate quantizing algorithms. For now, this is good enough.
        timeSinceBarSectionStart = Math.floor(timeSinceBarSectionStart / settings.quantize) * settings.quantize;
        return timeSinceBarSectionStart;
    },

    report: function(looper, shifter, cbfn) {
        let chans = `Channels    : `;
        let count = looper.getTrackCount();

        let muted = `Mute status: `;
        for(let i=0;i<count;++i) {
            const track = looper.getTrack(i);
            muted += track.getMuteState() ? "  M" : "  .";

            chans += ("" + track.getChannel()).padStart(3, ' ');
        }
        cbfn(chans);
        cbfn(muted);

        let soloed = `Solo status: `;
        for(let i=0;i<count;++i) {
            const track = looper.getTrack(i);
            soloed += track.getSoloState() ? "  S" : "  .";
        }
        cbfn(soloed);


        cbfn(`Track: ${looper.getCurrentTrack().getIndex()} Mode: ???`);
        cbfn(`Pass through (D#1): ${settings.passThrough ? 'On' : 'Off'}`);
        cbfn(`Octave shift (F#1): ${settings.octaveShift}`);
        cbfn(`Quanitze     (G#1): ${settings.quantize} / ${settings.ppqn}`);
        cbfn(``);
        cbfn(`Mute all     (C#2)`);
        cbfn(`Unmute all   (D#2)`);
        cbfn(`Solo mode    (F#2): ${settings.soloMode ? 'On' : 'Off'}`);
        cbfn(`Unsolo all   (G#2)`);
        cbfn(`Next chord   (A#2)`);
        cbfn(``);

        shifter.report(cbfn);
    }
};



const looperControls = [
    // Primary controls, 1st octave
    /*  0 : C  */ (looper, bIsDown) => { looper.setCurrentTrack(0) }, 
    /*  1 : C# */ (looper, bIsDown) => { settings.eraseLoop = bIsDown; }, 
    /*  2 : D  */ (looper, bIsDown) => { looper.setCurrentTrack(1) }, 
    /*  3 : D# */ (looper, bIsDown) => { if (bIsDown) settings.passThrough = !settings.passThrough; },
    /*  4 : E  */ (looper, bIsDown) => { looper.setCurrentTrack(2) }, 
    /*  5 : F  */ (looper, bIsDown) => { looper.setCurrentTrack(3) }, 
    /*  6 : F# */ (looper, bIsDown) => { if (bIsDown && ++settings.octaveShift > 2) settings.octaveShift = -2; },
    /*  7 : G  */ (looper, bIsDown) => { looper.setCurrentTrack(4) }, 
    /*  8 : G# */ (looper, bIsDown) => { if (bIsDown && (settings.quantize*=2) > 384) settings.quantize = 24; },
    /*  9 : A  */ (looper, bIsDown) => { looper.setCurrentTrack(5) }, 
    /* 10 : A# */ (looper, bIsDown) => { },
    /* 11 : B  */ (looper, bIsDown) => { looper.setCurrentTrack(6) }, 

    // Secondary controls, 2nd octave with some parallel concepts to first
    // e.g. If Primary is "set track", Second is "mute track"
    /*  0 : C  */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(0); else looper.muteToggleTrack(0);} }, 
    /*  1 : C# */ (looper, bIsDown) => { if (bIsDown) looper.muteToggleAllTracks() }, 
    /*  2 : D  */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(1); else looper.muteToggleTrack(1);} }, 
    /*  3 : D# */ (looper, bIsDown) => { if (bIsDown) looper.unmuteAllTracks() }, 
    /*  4 : E  */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(2); else looper.muteToggleTrack(2);} }, 
    /*  5 : F  */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(3); else looper.muteToggleTrack(3);} }, 
    /*  6 : F# */ (looper, bIsDown) => { settings.soloMode = bIsDown; }, 
    /*  7 : G  */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(4); else looper.muteToggleTrack(4);} }, 
    /*  8 : G# */ (looper, bIsDown) => { if (bIsDown) looper.unsoloAllTracks() }, 
    /*  9 : A  */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(5); else looper.muteToggleTrack(5);} }, 
    /* 10 : A# */ (looper, bIsDown) => { if (bIsDown) { shifter.nextChord(); }},
    /* 11 : B  */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(6); else looper.muteToggleTrack(6);} }, 

];

// Capture SIGINT to stop any outstanding notes
// This is also why we have a global sequencer object.
process.on('SIGINT', async function() {
    console.log("Caught interrupt signal, stopping sequence");
    sequencer.stopSequence();
    midiInputSend.sendMessage(midi_info.Messages.makeLocalControl(0, true));

    console.log("Sending notes off");
    sequencer.allNotesOff();
    await delay(100);

    console.log("Exitting");
    process.exit();
});


async function prepareUI() {
    console.log("Looper:");
    console.log("Commands:");
    console.log(`  off <N>: send "all notes off" message to specified channel`);
    console.log(`  p/print : show loop pattern to console`);
    console.log(`  c/chord : specify chord of the loop`);
    console.log(`  s/seq : specify the chord sequence, that the loop-will shift`);
    console.log(`  l/load : load loop pattern from JSON`);
    console.log(`  s/save : save loop pattern as JSON`);
    console.log(`  ? : review current settings`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });


    rl.on('line', (line) => {
        const cmd = line.split(' ');

        switch(cmd[0]) {
            case 'off':
                let track = parseInt(cmd[1], 10);
                sequencer.allNotesOff(looper.getTrack(track).getChannel());
                break;

            case 'p':
            case 'print':
                let loopdata = Exporter.raw(settings, looper);
                console.log(JSON.stringify(loopdata, ' ', 2));
                break;


            case 's':
            case 'save':
                const filename = cmd[1] ? cmd[1] : `${new Date().toISOString()}.json`;
                Exporter.json(settings, looper, filename);
                break;

            case 'l':
            case 'load':
                // Clear first, because I'm not interesting in merging loops
                // (but we don't pass the sequencer obj because we don't want to stop existing notes)
                looper.clearAllTracks();    
                // Load, assuming filename is correct/exists/etc
                Importer.json(settings, sequencer, looper, cmd[1]);
                break;


            case 'c':
            case 'chord':
                shifter.setMainChord(cmd[1]);
                break;

            case 's':
            case 'seq':
                shifter.setChordPattern(cmd[1]);
                break;
                        
            case '?':
                settings.report(looper, shifter, console.log);
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


function openPortByName(midiDevice, name, defaultIfFail) {
    for(let i=0; i<midiDevice.getPortCount(); ++i) {
        let portName = midiDevice.getPortName(i);
        if (name === portName.substr(0, name.length)) {
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
    // midiInput.openPortByName(process.env.STRUMMER_MIDI_INPUT);
    openPortByName(midiInput, process.env.STRUMMER_MIDI_INPUT, 0);

    midiInputSend = new midi.Output();
    openPortByName(midiInputSend, process.env.STRUMMER_MIDI_INPUT, 0);
    midiInputSend.sendMessage(midi_info.Messages.makeLocalControl(0, false));
    
    // Output
    const midiOutput = new midi.Output();
    openPortByName(midiOutput, process.env.STRUMMER_MIDI_OUTPUT, 0);
    // midiOutput.openPortByName(process.env.STRUMMER_MIDI_OUTPUT);

    sequencer = new performer.Sequencer(midiOutput);
    sequencer.setPPQN(settings.ppqn);

    shifter = new chord_shifter.Shifter();
    shifter.setMainChord("Am");
    shifter.setChordPattern("F C G Dm G");


    // A new keyboard object, used here to parse the input into text
    const keys = new performer.Keyboard();


    // Init
    looper = new Looper(settings.barCount);
    looper.addFourToTheFloor(0, 10);
    looper.setCurrentTrack(1); // start on a non-drum track, so the player doesn't lose the beaat on first ever experiment
    looper.setShifter(shifter);

    looper.populateSequencer(sequencer);

    settings.report(looper, shifter, console.log);

    // Init callbacks and event listeners
    sequencer.on('pulse', () => {
        const doesSoloStateApply = looper.doesSoloStateApply();

        

        // Remove the note(s) about to be played, on all muted channels
        // (and any tracks not solo'd, if appropriate)
        let count = looper.getTrackCount();
        for(let i=0;i<count;++i) {
            const track = looper.getTrack(i);
            if (track.getMuteState() || (doesSoloStateApply && !track.getSoloState())) {
                const channel = track.getChannel();
                // TODO: Only clear ONs, and its subsequent OFF
                sequencer.qClearCurrentNote(channel);
            }
        }

        // Remove the note(s) about to be player, and those at this point the loop
        if (settings.eraseLoop) {
            // From where do we delete this?
            const track = looper.getCurrentTrack();
            const channel = track.getChannel();
            // console.log(`deleting from ${channel}`)

            // Remove the immediate note
            sequencer.qClearCurrentNote(channel);

            // Remove from the loop, before it's played again
            let timeSinceBarSectionStart = settings.getTimeSinceBarSectionStart();

            // For multi-bar loops, we need to offset for the previous bars, also.
            // e.g. for a 2 bar loop, 0,2,3,4 are the first bars, so no addition needed
            looper.clearNotePairsAtTime(channel, timeSinceBarSectionStart);    
        }
    });

    
    sequencer.onBeat((bar) => {
        let barInLoop = bar % settings.barCount;
        if (barInLoop === 0) {
            looper.populateSequencer(sequencer);
        }
    }, 0); // only on the first bear


    // Inner loop
    const inputStream = midi.createReadStream(midiInput);
    inputStream.on("data", function (chunk) {
        const result = keys.onData(chunk);

        result.forEach((r) => {
            // For multi-bar loops, we need to offset for the previous bars, also.
            // e.g. for a 2 bar loop, 0,2,3,4 are the first bars, so no addition needed
            let timeSinceBarSectionStart = settings.getTimeSinceBarSectionStart();

            // Adapt the message
            let track = looper.getCurrentTrack();
            let channel = track.getChannel();
            let channelByte = (r.data[0] & 0xf0) | channel;
            let newData = [...r.data];

            newData[0] = channelByte;

            // Replay the message? Add to the looper?
            if (r.msg === midi_info.Constants.Messages.NOTE_ON) {
                // Controller keys
                if (r.pitch >= settings.keySplitControlStart && r.pitch < settings.keySplitControlEnd) {

                    looperControls[r.pitch - settings.keySplitControlStart](looper, true);

                    settings.report(looper, shifter, console.log);
                    //
                } else {
                    // console.log(`Q: ${timeBefore} => ${timeSinceLoopStart}  ${newData.join(' ')}`);
                    // Tweak the pitch
                    newData[1] += settings.octaveShift * 12;

                    if (!settings.passThrough) {
                        looper.addMessage(timeSinceBarSectionStart, channel, newData);
                    }
                    sequencer.sendMessage(newData);
                }

            } else if (r.msg === midi_info.Constants.Messages.NOTE_OFF) {
                // Controller keys
                if (r.pitch >= settings.keySplitControlStart && r.pitch < settings.keySplitControlEnd) {
                    looperControls[r.pitch - settings.keySplitControlStart](looper, false);
                } else {
                    // console.log(`Q': ${timeSinceLoopStart}  ${r.data}`);
                    // Tweak the pitch
                    newData[1] += settings.octaveShift * 12;

                    // Cheat!
                    timeSinceBarSectionStart += settings.quantize;

                    if (!settings.passThrough) {
                        looper.addMessage(timeSinceBarSectionStart, channel, newData);
                    }

                    sequencer.sendMessage(newData);
                }

            // Always pass through sound change messages
            } else if (r.msg === midi_info.Constants.Messages.SET_PROGRAM || r.msg === midi_info.Constants.Messages.SET_PARAMETER || r.msg === midi_info.Constants.Messages.SET_PITCHWHEEL) {
                sequencer.sendMessage(newData);

                // Also store them with the track, so this pattern can be rebuilt
                if (r.msg === midi_info.Constants.Messages.SET_PROGRAM) {
                    looper.getCurrentTrack().setProgram(newData[1]);
                }
                
                // TODO: Pitchwheel, CC changes to be stored, for MIDI exporter
            }

      }); // hceArof
    });
}


listDevices();

prepareUI();

main()

