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
let looperControls;

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
    keySplitController: 1, // 0 = full, 1 = short
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

        function nf(i) {// note name, which execute the handler 'i'
            let noteName = `???`;
            Object.keys(looperControls).forEach((key) => {
                const action = looperControls[key];
                if (action === i) {
                    noteName = midi_info.Names.getNoteFromMIDI(parseInt(key));
                }
            });

            return noteName;
        }

        cbfn(`Track: ${looper.getCurrentTrack().getIndex()} Mode: ???`);
        cbfn(`Erase note   (${nf(1)})`);
        cbfn(`Pass through (${nf(3)}): ${settings.passThrough ? 'On' : 'Off'}`);
        cbfn(`Octave shift (${nf(6)}): ${settings.octaveShift}`);
        cbfn(`Quanitze     (${nf(8)}): ${settings.quantize} / ${settings.ppqn}`);
        cbfn(``);
        cbfn(`Mute all     (${nf(13)})`);
        cbfn(`Unmute all   (${nf(15)})`);
        cbfn(`Solo mode    (${nf(18)}): ${settings.soloMode ? 'On' : 'Off'}`);
        cbfn(`Unsolo all   (${nf(20)})`);
        cbfn(`Next chord   (${nf(22)})`);
        cbfn(``);

        shifter.report(cbfn);
    }
};

// We number our actions from 0 to 23. These are mapped to the keys on the lower
// part of a keyboard. Usually, these fall directly to an octave, or half octave.
// (Not the best way of doing this, but fine for our purpose.)
const looperHandlers = [
    // Primary controls, 1st octave
    /*  0 : */ (looper, bIsDown) => { looper.setCurrentTrack(0) },
    /*  1 : */ (looper, bIsDown) => { settings.eraseLoop = bIsDown; },
    /*  2 : */ (looper, bIsDown) => { looper.setCurrentTrack(1) },
    /*  3 : */ (looper, bIsDown) => { if (bIsDown) settings.passThrough = !settings.passThrough; },
    /*  4 : */ (looper, bIsDown) => { looper.setCurrentTrack(2) },
    /*  5 : */ (looper, bIsDown) => { looper.setCurrentTrack(3) },
    /*  6 : */ (looper, bIsDown) => { if (bIsDown && ++settings.octaveShift > 2) settings.octaveShift = -2; },
    /*  7 : */ (looper, bIsDown) => { looper.setCurrentTrack(4) },
    /*  8 : */ (looper, bIsDown) => { if (bIsDown && (settings.quantize*=2) > 384) settings.quantize = 24; },
    /*  9 : */ (looper, bIsDown) => { looper.setCurrentTrack(5) },
    /* 10 : */ (looper, bIsDown) => { },
    /* 11 : */ (looper, bIsDown) => { looper.setCurrentTrack(6) },

    // Secondary controls, 2nd octave with some parallel concepts to first
    // e.g. If Primary is "set track", Second is "mute track"
    /* 12 : */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(0); else looper.muteToggleTrack(0);} },
    /* 13 : */ (looper, bIsDown) => { if (bIsDown) looper.muteToggleAllTracks() },
    /* 14 : */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(1); else looper.muteToggleTrack(1);} },
    /* 15 : */ (looper, bIsDown) => { if (bIsDown) looper.unmuteAllTracks() },
    /* 16 : */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(2); else looper.muteToggleTrack(2);} },
    /* 17 : */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(3); else looper.muteToggleTrack(3);} },
    /* 18 : */ (looper, bIsDown) => { settings.soloMode = bIsDown; },
    /* 19 : */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(4); else looper.muteToggleTrack(4);} },
    /* 20 : */ (looper, bIsDown) => { if (bIsDown) looper.unsoloAllTracks() },
    /* 21 : */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(5); else looper.muteToggleTrack(5);} },
    /* 22 : */ (looper, bIsDown) => { if (bIsDown) { shifter.nextChord(); }},
    /* 23 : */ (looper, bIsDown) => { if (bIsDown) { if (settings.soloMode) looper.soloToggleTrack(6); else looper.muteToggleTrack(6);} },

];

async function prepareControls() {
    if (settings.keySplitController === 0) {
        prepareControlsFull();
    } else {
        prepareControlsShort();
    }
}

async function prepareControlsShort() {
    const N = midi_info.Constants.Notes;

    looperControls = {};

    // 1st is partial octave, F-C. 3 black notes for control, 4 white channel controls
    // So here are the 7 handler indices for the notes (see looperHandlers)
    [
        {n:N.F,       h:2},
        {n:N.F_SHARP, h:1},
        {n:N.G,       h:4},
        {n:N.G_SHARP, h:3},
        {n:N.A,       h:5},
        {n:N.A_SHARP, h:6},
        {n:N.B,       h:7},
    ].forEach((mapper) => {
        looperControls[N.C3 + mapper.n] = mapper.h;
    });

    // 2nd whole octave
    for(let i=0;i<12;++i) {
        looperControls[N.C4 + i] = i + 12;
    }
}

async function prepareControlsFull() {
    // Whole octave: black notes are control, white for channels, from C3
    const N = midi_info.Constants.Notes;

    looperControls = {};

    for(let i=0;i<24;++i) {
        looperControls[N.C3 + i] = i;
    }
}

function isControlKey(pitch) {
    return typeof looperControls[pitch] !== typeof undefined ? true : false;
}

function doControlFrom(pitch, looper, isDown) {
    if (isControlKey(pitch)) {
        const handler = looperControls[pitch];
        looperHandlers[handler](looper, isDown);
    }
}


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


async function main() {

    // Input, from a named device in the .env file
    const midiInput = new midi.Input();
    performer.Utils.Midi.openPortByName(midiInput, process.env.MIDI_INPUT, 1);

    midiInputSend = new midi.Output();
    performer.Utils.Midi.openPortByName(midiInputSend, process.env.MIDI_INPUT, 1);
    midiInputSend.sendMessage(midi_info.Messages.makeLocalControl(0, false));
    
    // Output
    const midiOutput = new midi.Output();
    performer.Utils.Midi.openPortByName(midiOutput, process.env.MIDI_OUTPUT, 2);


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
                if (isControlKey(r.pitch)) {
                    doControlFrom(r.pitch, looper, true);

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
                if (isControlKey(r.pitch)) {
                    doControlFrom(r.pitch, looper, false);
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

performer.Utils.Midi.listDevices("MIDI input devices:", new midi.Input());
performer.Utils.Midi.listDevices("MIDI output devices:", new midi.Output());

prepareControls();
prepareUI();

main()

