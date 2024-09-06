
function raw(settings, looper, filename) {
    let loopdata = {
        filename: filename,
        settings: settings,
        tracks: [],
    };

    let count = looper.getTrackCount();
    for(let i=0;i<count;++i) {
        const track = looper.getTrack(i);
            const cdata = {
                channel: track.getChannel(),
                program: track.getProgram(),
                messages: [],
            };

        
            track.getMessageList().forEach((q) => {
                cdata.messages.push(q);
            });

            loopdata.tracks.push(cdata);
    }

    return loopdata;
}


function json(settings, sequencer, looper, filename) {
    const fs = require('fs');
    fs.readFile(filename, (err, data) => {
        if (err) throw err;

        let loopdata = JSON.parse(data);

        // TODO: Pass thru from looper to sequencer?
        //looper.setPPQN()
        sequencer.setPPQN(loopdata.settings.ppqn);

        loopdata.tracks.forEach((track, idx) => {
            let looperTrack = looper.getTrack(idx);

            // Basic track settings
            looperTrack.setChannel(track.channel);
            looperTrack.setProgram(track.program);
            
            // setProgram doesn't pass through with looper, so we do it here
            sequencer.setProgram(track.channel, track.program);

            // Messages
            track.messages.forEach((msg) => {
                looperTrack.addMessage(msg.t, msg.c, msg.d);
            });
        });

    });
}


module.exports = {
    raw,
    json,
};
    