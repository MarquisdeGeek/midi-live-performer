function MIDIMessage(timeElapse, channel, messageData) {
    return {
        t: timeElapse,
        c: channel,
        d: messageData,
    }
}


module.exports = {
    MIDIMessage,
};
