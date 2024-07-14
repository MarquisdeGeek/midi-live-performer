const midi = require('@julusian/midi');
const performer = require('midi-live-performer');


async function main() {

    // Input, from the last device (usually an external synth)
    const midiInput = new midi.Input();
    midiInput.openPort(midiInput.getPortCount() - 1);

    // A new keyboard object, used here to parse the input into text
    const keys = new performer.Keyboard();

    // Inner loop
    const inputStream = midi.createReadStream(midiInput)
    inputStream.on("data", function (chunk) {
        const result = keys.onData(chunk);

        result.forEach((r) => {
            let output = ``;

            output += ("" + r.channel).padStart(2) + " ";
            output += r.type.padEnd(14);
            output += r.param1.padEnd(32); // this length handles GM program names
            output += r.param2.padEnd(10);

            output += " : ";

            output += r.data.map((d)=>(""+d).padStart(3)).join(" ");
            output += " (";
            output += r.data.map((d)=>(""+d.toString(16)).padStart(2,'0')).join(" ");
            output += ")";

            console.log(output);
        }); // hcaEfor

      });

}


main()

