

function traceLog() {
    // console.log(...arguments)
}


function traceError() {
    // Not using console.error because these are internal messages of "TODO" et ak
    // and we don't want to stop the app because of those, since we can continue
    console.log(arguments)
}




const Sequencer = function(output) {
    const midi_info = require('midi-info');
    
    let beatsPerMinute = 120; // BPM is munged into 500000 microseconds pqn, for 4/4
    let qnDuration = midi_info.Constants.Pulses.DURATION_CROCHET;
    let pulsesPerQuarterNote = midi_info.Constants.Pulses.DURATION_CROCHET;
    let ppqnDivider = 24; // Node can't really keep up with lots of subdivisions, so this is our latency/accuracy fudge
    let quarterNotesPerBar = 4; // for bar calculations
    let intervalTimer;          // reference to the time object, or null if sequencer is stopped
    let intervalPulsesPerQuarter;
    let queue = [];
    let beatCallbacks;
    let bar, beat, pulse; //the time frame we'll be playing on the next interval

    (function ctor() {
        beatCallbacks = new Array(4).fill();

        restartSongPosition();
        restartTimer();

    })();

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
        if (pulse == 0)
            traceLog(` --- ${bar}  ${beat}  ${pulse} }`);

        queue.forEach((q) => {
            if (q.t === 0) {
                traceLog("  entry to play:", JSON.stringify(q))
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

        queue = nextQueue;


        // Callbacks, if the next interval will be playing a new beat
        if (pulse === 0) {
            if (beatCallbacks[beat]) {
                beatCallbacks[beat](bar, beat, pulse);
            }
        }

        if (pulse == 1)
            traceLog(` xxxx ${bar}  ${beat}  ${pulse} }`);

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

        traceLog(` crochet =: ${periodBetweenPulses * intervalPulsesPerQuarter} ms   intervalPulsesPerQuarter=${intervalPulsesPerQuarter} that means timer every ${periodBetweenPulses} ms and actual=${actualBPM}`);

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
    //
    
    function setProgram(chnl, patch) {
        output.sendMessage([midi_info.Constants.Messages.SET_PROGRAM | chnl, patch]);
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
        let firstChannel = chnl ? chnl : 0;
        let lastChannel = chnl ? chnl : 15;
        //
        let nextQueue = [];
        queue.forEach((q) => {
            if (q.c >= firstChannel && q.c <= lastChannel) {
                // NOP - don't re-add, we're clearing it
                // The exception is for NoteOff messages, although this doesn't handle
                // the case where extra NoteOn msgs are given later. Is this a normal or pathalogical case?
                // TOOD
                // I think the correct is to match Offs to Ons, by tracking them like the keyboard input
                // module
                if (q.d[0] === midi_info.Constants.Messages.NOTE_OFF) {
                    nextQueue.push(q);
                }
            } else {
                nextQueue.push(q);
            }
        });
        //
        queue = nextQueue;
    }


    // NOTE: Previous duration uses 1/1 for crochet, 2/1 for minim. Now we
    // use ppqn
    function qNote(waitFor, chnl, pitch, volume = 120, duration = 384) {

        waitFor = Math.floor(waitFor);
        duration = Math.floor(duration);
        
        qNoteOn(chnl, pitch, volume, waitFor);
        qNoteOff(chnl, pitch, waitFor+duration);

        traceLog(`Q.note (w=${waitFor}  d=${duration}) is:  ${JSON.stringify(queue)}`);
        // traceLog("Q is:", JSON.stringify(queue))
        return waitFor + duration;
    }


    function qNoteAtNextBar(chnl, pitch, volume = 120, duration = 384) {
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




    function qNoteOn(chnl, pitch, volume = 120, waitFor = 1) {
        // 
        if (chnl < 0 || chnl > 15) {
            return;
        }

        pitch  = Math.min(Math.max(Math.floor(pitch),  0), 127); // basic clamp to 0-127 range (first forcing to int)
        volume = Math.min(Math.max(Math.floor(volume), 0), 127); // basic clamp to 0-127 range

        waitFor = Math.floor(waitFor);
        
        // If startAt = 384
        queue.push({c:chnl, d:[midi_info.Constants.Messages.NOTE_ON | chnl, pitch, volume], t:Math.floor((waitFor * intervalPulsesPerQuarter) / qnDuration)});
        // queue.push({d:[144 | chnl, pitch, volume], t:Math.floor(duration * intervalPulsesPerQuarter)});
        traceLog(`Q.on (${waitFor}) is: ${JSON.stringify(queue)}`);
        return waitFor;
    }

    function qNoteOff(chnl, pitch, waitFor = 1) {
        waitFor = Math.floor(waitFor);

        queue.push({c:chnl, d:[midi_info.Constants.Messages.NOTE_OFF | chnl, pitch, 0], t:Math.floor((waitFor * intervalPulsesPerQuarter) / qnDuration)});
        traceLog(`Q.off (${waitFor}) is: ${JSON.stringify(queue)}`);

        return waitFor;
    }

    
    function allNotesOff(chnl) {
        let firstChannel = chnl ? chnl : 0;
        let lastChannel = chnl ? chnl : 15;
        //
        for(let c=firstChannel;c<=lastChannel;++c) {
            output.sendMessage([
                midi_info.Constants.Messages.SET_PARAMETER | c,
                midi_info.Constants.Messages.cc.ALL_NOTES_OFF,
                0
            ]);
        }
    }


    // TODO: Remove callbacks. Add multiple callbacks.
    function onBeat(cbfn, whichBeat) {
        let firstBeat = whichBeat ? whichBeat : 0;
        let lastBeat= whichBeat ? whichBeat : 3;
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
        //
        playNoteOff,
        playNoteOn,

        // Queuing
        qClear,
        qNote,
        qNoteOn,
        qNoteOff,

        qNoteAtNextBar,

        // System and utilities
        restartSequence,
        stopSequence,
        allNotesOff,

        // Callback/handlers
        onBeat,

        // Deprecated
        changePatch,
    };
};


module.exports = {
    Sequencer,
};
