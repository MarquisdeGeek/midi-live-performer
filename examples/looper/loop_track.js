

function LoopTrack(index, channel) {
    const MIDIMessageQueue = require('midi-live-performer').MIDIMessageQueue;
    const midi_info = require('midi-info');
    let playData;
    let isMuted;
    let isSolo;
    let programIndex;

    (function ctor() {
        isMuted = false;
        isSolo = false;
        programIndex = 0;
        clearTrack();
    })();


    function getIndex() {
        return index;
    }

    function getChannel() {
        return channel;
    }

    function getMessageList() {
        return playData;
    }

    function getSoloState() {
        return isSolo;
    }


    function clearTrack(sequencer) {
        if (sequencer) {
            sequencer.qClear(channel);
        }
        //
        playData = new MIDIMessageQueue();
    }


    function clearNotePairsAtTime(channel, timeSinceLoopStart) {
        // console.log(`------------------------------`)
        playData.clearNotePairsAtTime(channel, timeSinceLoopStart, ">>  ");
    }


    function addMessage(deltaTime, channel, data) {
        // playData.push({t: deltaTime, c: channel, data: data});
        playData.addMessage({t: deltaTime, c: channel, d: data});
    }


    function populateSequencer(sequencer, shifter) {
        playData.forEach((pd) => {

            // Don't shift the drums
            // (if might produce some interesting ideas for experimentation, but it's
            // not useful in the major of cases.)
            if (shifter && pd.c !== 10 && ((pd.d[0] & 0xf0) === midi_info.Constants.Messages.NOTE_ON || (pd.d[0] & 0xf0) === midi_info.Constants.Messages.NOTE_OFF)) {
                let newData = [ pd.d[0], pd.d[1], pd.d[2] ];
                newData[1] = shifter.getShiftedNote(newData[1]);
                sequencer.qMessage(pd.t, pd.c, newData);
                return;
            }
            sequencer.qMessage(pd.t, pd.c, pd.d);
        });
    }


    function unmute() {
        isMuted = false;
        return isMuted;
    }


    function unsolo() {
        isSolo = false;
        return isSolo;
    }

    
    function muteToggle() {
        isMuted = !isMuted;
        return isMuted;
    }


    function soloToggle() {
        isSolo = !isSolo;
        return isSolo;
    }

    
    function getMuteState() {
        return isMuted;
    }


    function setProgram(idx) {
        programIndex = idx;
    }

    function setChannel(idx) {
        channel = idx;
    }

    
    function getProgram() {
        return programIndex;
    }


    return {
        getIndex,
        getChannel,
        getMessageList,
        getMuteState,
        getSoloState,
        getProgram,
        //
        unmute,
        muteToggle,
        unsolo,
        soloToggle,
        setProgram,
        setChannel,
        //
        clearTrack,
        clearNotePairsAtTime,
        addMessage,
        populateSequencer
    }
}

module.exports = {
    LoopTrack,
};
