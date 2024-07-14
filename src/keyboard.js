
const Keyboard = function() {
    const midi_info = require('midi-info');
    let keyStates = [];
    let inputBytes = [];

    (function ctor() {
        for(let c=0;c<16;++c) {
            keyStates[c] = new Array(128).fill(0);
        }
    })();

    function flush() {
        inputBytes = [];
    }

    function consume2() {
        inputBytes.splice(0,2);
    }

    function consume3() {
        inputBytes.splice(0,3);
    }

    function onData(chunk) {
        inputBytes = inputBytes.concat([...chunk]);

        return processData();
    }

    function processData() {
        let retMessage = [];

        // Is there enough data to check for 1 byte messages?
        if (inputBytes.length < 1) {
            return retMessage;
        }

        let msgType = inputBytes[0] & 0xf0;
        let msgChannel = inputBytes[0] & 0x0f;

        // Is there enough data to check for 2 byte messages?
        if (inputBytes.length >= 2) {
            switch(msgType) {
                case midi_info.Constants.Messages.SET_PROGRAM:
                    retMessage.push({
                        msg:     midi_info.Constants.Messages.SET_PROGRAM,
                        channel: msgChannel,
                        program: inputBytes[1],

                        type: "setProgram",
                        param1: midi_info.Names.getProgram(inputBytes[1]),
                        param2: '',
                        data: inputBytes.slice(0,2)
                    });
                    consume2();
                    break;
            }
        }

        // Is there enough data to check for 3 byte messages?
        // TODO: THe spec allows sysex msgs (e.g.) to come between these messages
        // Q. Does the RtMIDI library handle this for us?
        if (inputBytes.length >= 3) {
            // Get the drum names when on channel 10 (rem: we count from 0, so 10 is 9)
            let patchFn = msgChannel == 9 ? midi_info.Names.getDrum : midi_info.Names.getNoteFromMIDI;

            switch(msgType) {
                case midi_info.Constants.Messages.NOTE_ON:
                    retMessage.push({
                        msg:     midi_info.Constants.Messages.NOTE_ON,
                        channel: msgChannel,
                        pitch:   inputBytes[1],
                        volume:  inputBytes[2],
                        
                        // extras, for serialisation/debug
                        type: "noteon",
                        param1: patchFn(inputBytes[1]),
                        param2: `vol:${inputBytes[2]}`,
                        data: inputBytes.slice(0,3)
                    });

                    keyStates[msgChannel][inputBytes[1]]++;

                    consume3();
                    break;

                case midi_info.Constants.Messages.NOTE_OFF:
                    retMessage.push({
                        msg:     midi_info.Constants.Messages.NOTE_OFF,
                        channel: msgChannel,
                        pitch:   inputBytes[1],
                        
                        // extras, for serialisation/debug
                        type: "noteoff",
                        param1: patchFn(inputBytes[1]),
                        param2: '',
                        data: inputBytes.slice(0,3)
                    });

                    keyStates[msgChannel][inputBytes[1]]--;

                    consume3();
                    break;

                case midi_info.Constants.Messages.SET_PARAMETER:
                    retMessage.push({
                        msg:     midi_info.Constants.Messages.SET_PARAMETER,
                        channel: msgChannel,
                        cc:      inputBytes[1],
                        value:   inputBytes[2],
                        
                        type: "setParameter",
                        param1: midi_info.Names.getCC(inputBytes[1]),
                        param2: `${inputBytes[2]}`,
                        data: inputBytes.slice(0,3)
                    });
                    consume3();
                    break;

                case midi_info.Constants.Messages.NOTE_KEY_PRESSURE:
                    retMessage.push({
                        msg:     midi_info.Constants.Messages.NOTE_KEY_PRESSURE,
                        channel: msgChannel,
                        pitch:   inputBytes[1],
                        pressure:inputBytes[2],
                        
                        type: "keyPressure",
                        param1: `pitch:${inputBytes[1]}`,
                        param2: `press:${inputBytes[2]}`,
                        data: inputBytes.slice(0,3)
                    });
                    consume3();
                    break;

                case midi_info.Constants.Messages.SET_PITCHWHEEL:
                    let wheelPosition = (inputBytes[2]<<7) | inputBytes[1]; // both are 7 bits long;
                    retMessage.push({
                        msg:     midi_info.Constants.Messages.NOTE_OFF,
                        channel: msgChannel,
                        wheel: wheelPosition,
                        lsb:   inputBytes[1],
                        msb:   inputBytes[2],
                        
                        type: "pitchwheel",
                        param1: `${wheelPosition}`,
                        param2: '',
                        data: inputBytes.slice(0,3)
                    });
                    consume3();
                    break;
            }
        
        }

        if (retMessage.length === 0 && inputBytes.length) {
            console.log(`Unknown: ${inputBytes}`);
        }

        return retMessage;
    }


    function getLowestNotes(chnl, keySplitMax=128, numberOfNotes = 1) {
        let firstChannel = chnl ? chnl : 0;
        let lastChannel = chnl ? chnl : 15;
        //
        let results = [];

        for(let c=firstChannel;c<=lastChannel;++c) {
            let leftToDo = numberOfNotes;
            for(let p=0;p<keySplitMax;++p) {
                if (keyStates[c][p]) {
                    results.push({channel:c, pitch:p});
                    if (--leftToDo === 0) {
                        break;
                    }
                }
            }
        }

        return results;
    }

    return {
        flush,
        onData,
        //
        getLowestNotes,

    };
}


module.exports = {
    Keyboard,
};
