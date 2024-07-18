const MIDIMessageQueue = function() {
    const midi_info = require('midi-info');
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


    // If there is a note about to be played, then remove it (and its equivalent NoteOff msg)
    // from the list
    function clearNotePairsAtTime(channel, atTime) {
        let nextQueue = [];
        let offNoteIndicesToAlsoRemove = [];

        queue.forEach((q, idx) => {
            let readdThisMessage = true;

            if (q.c === channel && q.t === atTime) {
                // Only the NoteOn msgs
                if ((q.d[0] & 0xf0) === midi_info.Constants.Messages.NOTE_ON) {
                    readdThisMessage = false;

                    // What specifc note off are we looking for?
                    let pitch = q.d[1];

                    // Find the corresponding Off
                    queue.forEach((qoff, offIdx) => {
                        if ((qoff.d[0] & 0xf0) === midi_info.Constants.Messages.NOTE_OFF) {
                            let offPitch = q.d[1];
                            if (pitch === offPitch) {
                                offNoteIndicesToAlsoRemove.push(offIdx);
                            }
                        }
                    });
                }
            }

            // And any NoteOffs, that were played at t=0
            if (offNoteIndicesToAlsoRemove.indexOf(idx) !== -1) {
                readdThisMessage = false;
            }

            //            
            if (readdThisMessage) {
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
        addMessage
    };
}


module.exports = {
    MIDIMessageQueue,
};
