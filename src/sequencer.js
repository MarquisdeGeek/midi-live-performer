const EventEmitter = require('events').EventEmitter;
const util = require("util");

const MIDIMessageQueue = require('./midi_message_queue').MIDIMessageQueue;



function traceLog() {
    // console.log(...arguments);
}


function traceError() {
    // Not using console.error because these are internal messages of "TODO" et ak
    // and we don't want to stop the app because of those, since we can continue
    console.log(...arguments);
}


const Sequencer = function(output) {
    const midi_info = require('midi-info');
    const self = this;

    let beatsPerMinute = 120; // BPM is munged into 500000 microseconds pqn, for 4/4
    let qnDuration = midi_info.Constants.Pulses.DURATION_CROCHET;
    let pulsesPerQuarterNote = midi_info.Constants.Pulses.DURATION_CROCHET;
    let ppqnDivider = 24; // Node can't really keep up with lots of subdivisions, so this is our latency/accuracy fudge
    let quarterNotesPerBar = 4; // for bar calculations
    let intervalTimer;          // reference to the time object, or null if sequencer is stopped
    let intervalPulsesPerQuarter;// how many calls to the setIntervall callback for each quarter note?
    let queue;
    let beatCallbacks;
    let bar, beat, pulse; //the time frame we'll be playing on the next interval

    (function ctor() {
        beatCallbacks = new Array(4).fill();
        queue = new MIDIMessageQueue();

        restartSongPosition();
        restartTimer();

    })();

    function on() {
        return self.on(...arguments);
    }

    function restartSongPosition() {
        bar = beat = 0;
        pulse = 0;
    }

    function restartSequence() {
        restartTimer();
    }

    function stopSequence() {
        stopTimer();
    }

    function setBPM(bpm) {
        beatsPerMinute = bpm;

        if (intervalTimer) {
            restartTimer();
        }
    }

    function setPPQN(ppqn) {
        pulsesPerQuarterNote = ppqn; 

        if (intervalTimer) {
            restartTimer();
        }
    }
    
    /**
     * Set this to a higher number for slower machines, as it results in fewer timer messages.
     * (The timing will be less accurate, however)
     * 
     * Defaults to 8-16 are good enough for basic rhythms.
     * @param {int} ppqn 
     */
    function setPPQNDivider(ppqn) {
        ppqnDivider = ppqn; 

        if (intervalTimer) {
            restartTimer();
        }
    }
    
    // TODO: check count of bar/beat/pulse
    function checkQueue() {
        let nextQueue = [];

        self.emit('pulse', bar, beat, pulse);

        queue.forEach((q) => {
            if (q.t === 0) {
                output.sendMessage(q.d);
            } else if (q.t < 0) {
                // NOP - this event is in the past.
                // Not sure how we missed it, but ignore it anyway
                traceError(`Missed a message: ${q.d}`);
            } else {
                --q.t;
                nextQueue.push(q);
            }
        });

        // Move the song pointer
        if (++pulse === intervalPulsesPerQuarter) {
            pulse = 0;
            if (++beat === quarterNotesPerBar) {
                beat = 0;
                ++bar;
            }
        }

        queue.replaceQueue(nextQueue);

        // Callbacks, trigger one if the next interval will be playing a new beat
        if (pulse === 0) {
            // New way!
            self.emit('beat', bar, beat, pulse);

            // Old way
            if (beatCallbacks[beat]) {
                beatCallbacks[beat](bar, beat, pulse);
            }
        }

        // Or a new bar
        if (beat === 0) {
            self.emit('bar', bar, beat, pulse);
        }
    }

    function restartTimer() {
        // Period of a quarter note (aka crochet). i.e. the time between successive ones
        let periodMS = 1000 / (beatsPerMinute / 60);

        // How many sub-intervals exist within a single quarter note?
        // REM: our implementation supports a divider because sending too many
        // intervals can cause the Node engine to send them irregularly.
        intervalPulsesPerQuarter = (pulsesPerQuarterNote / ppqnDivider);
        
        let periodBetweenPulses = Math.floor(periodMS / intervalPulsesPerQuarter);

        let actualBPM = 60000/*seconds, in ms (our units for pulse period)*/ / (periodBetweenPulses * intervalPulsesPerQuarter);

        traceError(`Timing: Target BPM = ${beatsPerMinute} // crochet = ${periodBetweenPulses * intervalPulsesPerQuarter} ms  // intervalPulsesPerQuarter=${intervalPulsesPerQuarter} that means timer every ${periodBetweenPulses} ms and actual=${actualBPM}`);

        stopTimer();
        //
        intervalTimer = setInterval(() => {
            checkQueue();
        }, periodBetweenPulses);
    }


    function stopTimer() {
        if (intervalTimer) {
            clearInterval(intervalTimer);
        }

        intervalTimer = null;
    }


    function setProgram(chnl, patch) {
        output.sendMessage([midi_info.Constants.Messages.SET_PROGRAM | chnl, patch]);
    }


    function sendMessage(data) {
        output.sendMessage(data);
    }


    //* @deprecated */
    function changePatch(chnl, patch) {
        return setProgram(chnl, patch);
    }


    function playNoteOn(chnl, pitch, volume = 120) {
        output.sendMessage([
            midi_info.Constants.Messages.NOTE_ON  | chnl,
            pitch,
            volume
        ]);
    }


    function playNoteOff(chnl, pitch) {
        output.sendMessage([
            midi_info.Constants.Messages.NOTE_ON  | chnl,
            pitch,
            0
        ]);
    }


    function sendCC(chnl, ccMsg, ccParam) {
        output.sendMessage([
            midi_info.Constants.Messages.SET_PARAMETER  | chnl,
            ccMsg,
            ccParam
        ]);
    }


    function qClear(chnl) {
        // TOOD
        // I think the correct is to match Offs to Ons, by tracking them like the keyboard input
        // module

        return queue.clear(chnl);
    }


    // If there is a note about to be played, then remove it (and its equivalent NoteOff msg)
    // from the list
    function qClearCurrentNote(channel) {
        queue.clearNotePairsAtTime(channel, 0);
    }


    // NOTE: Previous duration uses 1/1 for crochet, 2/1 for minim. Now we
    // use ppqn
    function qNote(waitFor, chnl, pitch, volume = 120, duration = qnDuration) {

        waitFor = Math.floor(waitFor);
        duration = Math.floor(duration);
        
        qNoteOn(chnl, pitch, volume, waitFor);
        qNoteOff(chnl, pitch, waitFor+duration);

        traceLog(`Q.note (w=${waitFor}  d=${duration}) is:  ${JSON.stringify(queue)}`);
        // traceLog("Q is:", JSON.stringify(queue))
        return waitFor + duration;
    }


    function getCurrentBar() {
        return bar;
    }

    function getTimeSinceBarStart() {
        let pulsesSinceStart = pulsesPerQuarterNote * beat;
        pulsesSinceStart += pulse * ppqnDivider;

        return pulsesSinceStart;
    }


    // If we have a 2 bar section, this will get us the time of
    // the first bar, in that 2 bar block.
    function getTimeSinceBarSectionStart(barCount) {
        let timeSinceBarStart = getTimeSinceBarStart();

        // For multi-bar loops, we need to offset for the previous bars, also.
        // e.g. for a 2 bar loop, 0,2,3,4 are the first bars, so no addition needed
        let barInLoop = getCurrentBar() % barCount;
        let timeSinceLoopStart = (pulsesPerQuarterNote * quarterNotesPerBar * barInLoop) + timeSinceBarStart;

        return timeSinceLoopStart;
    }


    function qNoteAtNextBar(chnl, pitch, volume = 120, duration = qnDuration) {
        let nextBeatIn = intervalPulsesPerQuarter - pulse;
        let beatsLeftInBar = quarterNotesPerBar - beat;
        let waitFor = nextBeatIn;

        // Are we about to start the next bar?
        if (beat === 0 && pulse === 0) {
            waitFor = 0;

        // Are we in the final beat? If so, ignore add the pulses for the remaining beat
        } else if (beatsLeftInBar == 1) {
            // NOP

        // Otherwise, since we already have the pulse count in waitFor, add the pulses for all remaining beats
        } else {
            waitFor += (beatsLeftInBar-1) * intervalPulsesPerQuarter;
        }

        qNote(waitFor, chnl, pitch, volume, duration);

        traceLog("Q is:", JSON.stringify(queue))

        return waitFor;
    }


    function qMessage(waitFor, chnl, data) {
        waitFor = Math.floor(waitFor);

        queue.addMessage({c:chnl, d:data, t:Math.floor((waitFor * intervalPulsesPerQuarter) / qnDuration)});
        return waitFor;
    }


    function qNoteOn(chnl, pitch, volume = 120, waitFor = 0) {
        // 
        if (chnl < 0 || chnl > 15) {
            return;
        }

        pitch  = Math.min(Math.max(Math.floor(pitch),  0), 127); // basic clamp to 0-127 range (first forcing to int)
        volume = Math.min(Math.max(Math.floor(volume), 0), 127); // basic clamp to 0-127 range

        waitFor = Math.floor(waitFor);
        
        queue.addMessage({c:chnl, d:[midi_info.Constants.Messages.NOTE_ON | chnl, pitch, volume], t:Math.floor((waitFor * intervalPulsesPerQuarter) / qnDuration)});

        traceLog(`Q.on (${waitFor}) is: ${JSON.stringify(queue)}`);
        return waitFor;
    }

    function qNoteOff(chnl, pitch, waitFor = 1) {
        waitFor = Math.floor(waitFor);

        queue.addMessage({c:chnl, d:[midi_info.Constants.Messages.NOTE_OFF | chnl, pitch, 0], t:Math.floor((waitFor * intervalPulsesPerQuarter) / qnDuration)});
        traceLog(`Q.off (${waitFor}) is: ${JSON.stringify(queue)}`);

        return waitFor;
    }


    function allNotesOff(chnl) {
        let firstChannel = chnl === undefined ? 0 : chnl;
        let lastChannel = chnl === undefined ? 15 : chnl;
        //
        for(let c=firstChannel;c<=lastChannel;++c) {
            output.sendMessage([
                midi_info.Constants.Messages.SET_PARAMETER | c,
                midi_info.Constants.Messages.cc.ALL_NOTES_OFF,
                0
            ]);
        }
    }


    // TODO: Remove callbacks, to migrate fully to EventEmitter
    function onBeat(cbfn, whichBeat) {
        let firstBeat = whichBeat === undefined ? 0 : whichBeat;
        let lastBeat= whichBeat === undefined ? 3 : whichBeat;
        //
        for(let b=firstBeat;b<=lastBeat;++b) {
            beatCallbacks[b] = cbfn;
        }
    }


    return {
        // Immediate actions
        setBPM,
        setPPQN,
        setPPQNDivider,
        setProgram,
        sendCC,
        sendMessage,
        //
        playNoteOff,
        playNoteOn,

        // Queuing
        qClear,
        qClearCurrentNote,
        qMessage,
        qNote,
        qNoteOn,
        qNoteOff,

        qNoteAtNextBar,

        // System and utilities
        restartSequence,
        stopSequence,
        allNotesOff,
        //
        getCurrentBar,
        getTimeSinceBarStart,
        getTimeSinceBarSectionStart,

        // Callback/handlers
        onBeat,
        on,

        // Deprecated
        changePatch,
    };
};

util.inherits(Sequencer, EventEmitter);

module.exports = {
    Sequencer,
};
