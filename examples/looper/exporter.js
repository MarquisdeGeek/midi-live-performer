
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


function json(settings, looper, filename) {
    const loopdata = raw(settings, looper, filename);
    const fs = require('fs');
    fs.writeFile(filename, JSON.stringify(loopdata, ' ', 2), () => {});
}


module.exports = {
    raw,
    json,
};
    