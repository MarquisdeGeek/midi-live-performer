const midi_info = require('midi-info');


function MIDIMessage(timeElapse, channel, messageData) {
    return {
        t: timeElapse,
        c: channel,
        d: messageData,
    }
}


function isNoteOn(data) {
    if ((data[0] & 0xf0) === midi_info.Constants.Messages.NOTE_ON && data.length > 2 && data[2] !== 0) {
        return true;
    }

    return false;
}


function isNoteOff(data) {
    if ((data[0] & 0xf0) === midi_info.Constants.Messages.NOTE_OFF) {
        return true;
    }

    if ((data[0] & 0xf0) === midi_info.Constants.Messages.NOTE_ON && data.length > 2 && data[2] === 0) {
        return true;
    }
    return false;
}


module.exports = {
    // Objects
    MIDIMessage,

    // Helper methods
    isNoteOn,
    isNoteOff
};
