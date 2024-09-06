const midi_info = require('midi-info');


function chordMapper(chordName) {
let chordInfo;
let name;

    (function ctor(chordName) {

        name = chordName;
        
        chordInfo = midi_info.Chords.parseChordFromName(chordName);
        // console.log(chordName, chordInfo);

    })(chordName);

    function getMappingTo(otherChord) {
        let otherChordInfo = otherChord.getChordInfo();
        let delta = otherChordInfo.chordRoot - chordInfo.chordRoot;
        // console.log(otherChordInfo)

        // The basic pitch shift takes place in the relative major
        // (we move the 3rds etc later)
        if (chordInfo.isMinor && otherChordInfo.isMajor) {
            delta -= 3;
        }
        if (otherChordInfo.isMajor && chordInfo.isMajor) {
            delta += 3;
        }

        // We don't want to move any note move than 6 semi
        // (better algorithms should be considered in the future)
        if (delta > 6) {
            delta -= 12;
        } else if (delta < -6) {
            delta += 12;
        }

        // ??
        let deltaList =  new Array(12).fill(delta);

        // Some simple logic for starters:
        // 1. A minor chord, moving to a major...
        if (chordInfo.isMinor && otherChordInfo.isMajor) {
            //...then treat the minor as its relative major (e.g. Am => C)
            // and move the minor 3rd up 1 semi to major (the C=>Eb=>E, in the Am=>C case)
            let thirdOfThisChord = chordInfo.chordRoot
                //  + 5    // the relative major
                 + 4;   // the third;

            thirdOfThisChord = thirdOfThisChord % 12;
            deltaList[thirdOfThisChord]--;

            // Move the 7th
            let seventh = (chordInfo.chordRoot + 11) % 12;
            deltaList[seventh]++;
        }

        return deltaList;
    }

    function getChordInfo() {
        return chordInfo;
    }

    
    function getName() {
        return name;
    }


    return {
        getName,
        getMappingTo,
        getChordInfo
    }
}


function Shifter() {
let mappingList = [];
let offsetMatrix = [];
let primaryChord;
let chordIndex;

    function setMainChord(chordName) {
        primaryChord = new chordMapper(chordName);

        chordIndex = 0;

        rebuildShiftingMatrix();
    }


    function setChordPattern(chordList) {

        mappingList = [];

        // Determine all the chords
        let asArray = chordList.split(" ");
        // console.log(asArray);
        asArray.forEach((c) => {
            //  console.log(`C: ${c} ...`);
            let chord = new chordMapper(c);
            mappingList.push(chord);
        });

        rebuildShiftingMatrix();
    }


    function rebuildShiftingMatrix() {

        offsetMatrix = [];

        mappingList.forEach((mapChord) => {
            let offsetList = primaryChord.getMappingTo(mapChord);
            console.log(`C: ${mapChord.getChordInfo().chordName} ... ${offsetList}`);
            offsetMatrix.push(offsetList);

       });


        // const mapping = rebuildShiftingMatrix(chord); 
        // console.log(`C: ${c} => ${mapping}`);
        // mappingList.push(mapping);


        // Check index hasn't gone beyond any new bounds
        if (chordIndex > mappingList.length) {
            chordIndex = 0;
        }
    }


    function determineNoteOffsets() {

    }

    function getShiftedNote(note) {
        // If nothing setup...
        if (offsetMatrix.length === 0) {
            return note;
        }

        // Or if we're on the primary chord
        if (chordIndex === 0) {
            return note;
        }

        // Else
        let scaled = note % 12;
        let newNote = note + offsetMatrix[chordIndex - 1][scaled];

        if (newNote < 0 || newNote > 127) {
            return 0;
        }

        return newNote;
    }

    function nextChord() {
        if (++chordIndex > mappingList.length) {
            chordIndex = 0;
        }
    }


    function report(cbfn) {
        cbfn(`Loop chord: ${primaryChord.getName()}  ${chordIndex===0?"<<<":""}`);

        mappingList.forEach((c, idx) => {
            cbfn(`  ${idx+1}: ${c.getName()}   ${chordIndex===idx+1?"<<<":""}`);
        });

        cbfn(``);
    }


    return {
        setMainChord,
        setChordPattern,
        getShiftedNote,
        nextChord,

        report
    }
}


module.exports = {
    Shifter
};
    