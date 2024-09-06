const LoopTrack = require('./loop_track').LoopTrack;
const midi_info = require('midi-info');


function Looper(barCount) {
    const MAX_TRACKS = 7;
    let trackList;
    let currentTrack;
    let theShifter;


    (function ctor() {
        currentTrack = 0;

        trackList = [];
        for(let i=0;i<MAX_TRACKS;++i) {
            let trk = new LoopTrack(i, i == 0 ? 10 : i-1);
            trackList.push(trk);
        }
    })();


    // Basic pattern
    function addFourToTheFloor(trackIndex, channel) {
        let qnDuration = midi_info.Constants.Pulses.DURATION_CROCHET;

        for(let i=0;i<4 * barCount;++i) {
            trackList[trackIndex].addMessage(i * qnDuration, channel, [midi_info.Constants.Messages.NOTE_ON | channel, midi_info.Constants.Drums.ACOUSTIC_BASS_DRUM, (i%3)==0 ? 100 : 80]);
            trackList[trackIndex].addMessage(i * qnDuration + qnDuration/4, channel, [midi_info.Constants.Messages.NOTE_OFF | channel, midi_info.Constants.Drums.ACOUSTIC_BASS_DRUM, 0]);

            // Last beat of bar && it's an odd numbered bar
            if ((i % 4) == 3) {
                trackList[trackIndex].addMessage(i * qnDuration + qnDuration/2, channel, [midi_info.Constants.Messages.NOTE_ON | channel, midi_info.Constants.Drums.OPEN_HI_HAT, 80]);
                trackList[trackIndex].addMessage(i * qnDuration + qnDuration/4, channel, [midi_info.Constants.Messages.NOTE_OFF | channel, midi_info.Constants.Drums.OPEN_HI_HAT, 0]);    
            }

            // Last beat of bar && it's an odd numbered bar
            if ((i % 8) == 7) {
                trackList[trackIndex].addMessage(i * qnDuration + qnDuration/2, channel, [midi_info.Constants.Messages.NOTE_ON | channel, midi_info.Constants.Drums.ACOUSTIC_BASS_DRUM, 80]);
                trackList[trackIndex].addMessage(i * qnDuration + qnDuration/4, channel, [midi_info.Constants.Messages.NOTE_OFF | channel, midi_info.Constants.Drums.ACOUSTIC_BASS_DRUM, 0]);    
            }
        }
    }


    // Control
    function getTrackCount() {
        return trackList.length;
    }


    function getTrack(track) {
        if (track >= 0 && track < MAX_TRACKS) {
            return trackList[track];
        }
        return undefined;
    }


    function setCurrentTrack(track) {
        if (track >= 0 && track < MAX_TRACKS) {
            currentTrack = track;
        }
    }


    function clearAllTracks(sequencer) {
        for(let t=0;t<MAX_TRACKS;++t) {
            trackList[t].clearTrack(sequencer);
        }  
    }


    function clearCurrentTrack(sequencer) {
        return trackList[currentTrack].clearTrack(sequencer);        
    }



    function clearCurrentTrack(sequencer) {
        return trackList[currentTrack].clearTrack(sequencer);        
    }


    function clearNotePairsAtTime(channel, timeSinceLoopStart) {
        trackList.forEach((track) => {
            track.clearNotePairsAtTime(channel, timeSinceLoopStart);
        });
    }


    function addMessage(deltaTime, channel, data) {
        return trackList[currentTrack].addMessage(deltaTime, channel, data);
    }


    function populateSequencer(sequencer) {
        trackList.forEach((track) => {
            track.populateSequencer(sequencer, theShifter);
        });
    }


    function getCurrentTrack() {
        return trackList[currentTrack];
    }

    
    function unmuteAllTracks() {
        trackList.forEach((track) => {
            track.unmute();
        });
    }


    function unsoloAllTracks() {
        trackList.forEach((track) => {
            track.unsolo();
        });
    }

    
    function muteToggleAllTracks() {
        trackList.forEach((track) => {
            track.muteToggle();
        });
    }


    function muteToggleTrack(trackIndex) {
        return getTrack(trackIndex).muteToggle();
    }


    function soloToggleTrack(trackIndex) {
        return getTrack(trackIndex).soloToggle();
    }

    
    function getTrackMuteState() {
        return getCurrentTrack().getMuteState();
    }

    function setShifter(shifter) {
        theShifter = shifter;
    }


    // i.e. are any of the solo modes on? If so, solo state applies and we must
    // mute all non-solo tracks
    function doesSoloStateApply() {
        let applies = false;
        trackList.forEach((track) => {
            applies |= track.getSoloState();
        });

        return applies;
    }


    return {
        addFourToTheFloor,
        //
        getTrack,
        getTrackCount,
        addMessage,
        setCurrentTrack,
        doesSoloStateApply,
        clearAllTracks,
        clearCurrentTrack,
        clearNotePairsAtTime,
        setShifter,
        //
        unmuteAllTracks,
        unsoloAllTracks,
        soloToggleTrack,
        muteToggleTrack,
        muteToggleAllTracks,
        getTrackMuteState,
        getCurrentTrack,
        //
        populateSequencer
    }
}

module.exports = {
    Looper,
};
