const MIDIMessageQueue = function() {
    const midi_info = require('midi-info');
    const MIDIMessage = require('./midi_message');
    let queue = []; // each object has t:<time> c:<channel> d:<data>


    (function ctor() {
        clear();
    })();


    function clear(chnl) {
        let firstChannel = chnl === undefined ? 0 : chnl;
        let lastChannel = chnl === undefined ? 15 : chnl;
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
                if (MIDIMessage.isNoteOff(q.d)) {
                    nextQueue.push(q);
                }
            } else {
                nextQueue.push(q);
            }
        });
        //
        queue = nextQueue;
    }


    // If there is a note about to be played, then remove it (and its equivalent NoteOff msg)
    // from the list
    function clearNotePairsAtTime(channel, atTime) {
        let nextQueue = [];
        let offNoteIndicesToAlsoRemove = [];

        queue.forEach((q, idx) => {
            let reAddThisMessage = true;

            if (q.c === channel && q.t === atTime) {
                // Only the NoteOn msgs
                if (MIDIMessage.isNoteOn(q.d)) {
                    reAddThisMessage = false;

                    // What specifc note off are we looking for?
                    let pitch = q.d[1];

                    // Find the corresponding Off
                    queue.some((qoff, offIdx) => {
                        if (MIDIMessage.isNoteOff(qoff.d)) {
                            let offPitch = q.d[1];
                            if (pitch === offPitch) {
                                offNoteIndicesToAlsoRemove.push(offIdx);
                                // Stop after the 'off' has been found, as we don't
                                // want to remove another 'off' for an 'on' note that hasn't
                                // yet been played
                                return true;
                            }
                        }
                    });
                }
            }

            // And any NoteOffs, that were played at t=0
            if (offNoteIndicesToAlsoRemove.indexOf(idx) !== -1) {
                reAddThisMessage = false;
            }

            //            
            if (reAddThisMessage) {
                nextQueue.push(q);
            }
        });

        queue = nextQueue;
    }


    function forEach(cbfn) {
        queue.forEach((q, idx) => {
            cbfn(q, idx);
        });
    }
    
    
    function some(cbfn) {
        return queue.some((q, idx) => {
            return cbfn(q, idx);
        });
    }
    
    
    function addMessage(msg) {
        queue.push(msg);
    }
    

    function replaceQueue(nextQueue) {
        queue = nextQueue;
    }

    
    return {
        clear,
        clearNotePairsAtTime,
        replaceQueue,
        forEach,
        some,
        addMessage
    };
}


module.exports = {
    MIDIMessageQueue,
};
