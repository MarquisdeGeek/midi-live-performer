const Tuning = {
    STANDARD:  [40, 45, 50, 55, 59, 64],
    DROPPED_D: [38, 45, 50, 55, 59, 64],
};


const Guitar = function() {
    const midi_info = require('midi-info');
    let tuning = [];


    (function ctor() {
        setTuning(Tuning.STANDARD);
    })();


    function setTuning(tuneList) {
        tuning = Object.assign(tuneList);
    }

    function generateChordNamed(fullname) {

        // For basic types. e.g. D7, C/G strip off anything before a / or a ()
        let idxSlash = fullname.indexOf('/');
        let idxBracket = fullname.indexOf('(');
        let rootName;

        if (idxSlash === -1 && idxBracket === -1) {
            // Plain chord name
            rootName = fullname;
        } else if (idxSlash !== -1 && idxBracket !== -1) {
            // Both a / and () so split at the first symbol
            rootName = fullname.substring(0, Math.min(idxSlash, idxBracket));
        } else if (idxSlash !== -1) {
            // Only one symbol, split at the first (whichever is not -1)
            rootName = fullname.substring(0, idxSlash);
        } else if (idxBracket !== -1) {
            // Only one symbol, split at the first (whichever is not -1)
            rootName = fullname.substring(0, idxBracket);
        }

        console.log(`${fullname} : using chord of rootName = ${rootName} (${idxSlash} / ${idxBracket})`);
        
        
        return generateChord(rootName, 0);       

    }


    // TODO: This is woefully inadaquate, so I'll let a proper guitarist suggestion something!
    // It's also only suitable for standard tunings
    function generateChord(rootName, inversion) {
        const NO = undefined;
        const OPEN = 0;

        // Check for, then remove, any indicate that this is a minor
        let minorIdx = rootName.indexOf('m');
        if (minorIdx === -1) {
            // Major shape for A, according to https://www.chordie.com/, with an offset
            // (this is not realistic, as sliding up 12 frets is not accurate, but I'll
            // wait for a PR from a real guitarist first.)
            let fretOffset = midi_info.Names.getMIDIFronName(rootName);

            return [
                OPEN + fretOffset,
                4 + fretOffset,
                2 + fretOffset,
                2 + fretOffset,
                2 + fretOffset,
                OPEN + fretOffset
            ]
        }

        // Strip the minor off
        rootName = rootName.substr(0, minorIdx);
      
        let fretOffset = midi_info.Names.getMIDIFronName(rootName);

        return [
            OPEN + fretOffset,
            3 + fretOffset,
            2 + fretOffset,
            2 + fretOffset,
            1 + fretOffset,
            OPEN + fretOffset
        ];
    }

    function getStringPitch(stringIdx, fretPosition) {
        if (typeof fretPosition === typeof undefined || isNaN(fretPosition)) {
            return undefined;
        }

        return tuning[stringIdx] + fretPosition;
    }


    return {
        setTuning,
        generateChord,
        generateChordNamed,
        //
        getStringPitch,

    };
}


module.exports = {
    Constants: {
        Tuning
    },
    //
    Guitar,
};
