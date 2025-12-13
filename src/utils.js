// General functions
function enumerateDevices(device) {
    let devlist = [];

    for(let i=0; i<device.getPortCount(); ++i) {
        devlist.push({id:i, name: device.getPortName(i)});
    }

    return devlist;
}


const Utils = {

    Midi: {
        enumerateDevices,
        
        listDevices(title, device, cbfn=console.log) {
            cbfn(title);

            let deviceList = enumerateDevices(device);
            deviceList.map((d) => cbfn(`${d.id} : ${d.name}`));

            cbfn('');
        },


        openPortByName(midiDevice, name, defaultIfFail) {
            // Try whole name, as is
            for(let i=0; i<midiDevice.getPortCount(); ++i) {
                let portName = midiDevice.getPortName(i);
                if (name === portName) {
                    midiDevice.openPort(i);
                    return i;
                }
            }

            // Try the first part
            for(let i=0; i<midiDevice.getPortCount(); ++i) {
                let portName = midiDevice.getPortName(i);
                if (name === portName.substr(0, name.length)) {
                    midiDevice.openPort(i);
                    return i;
                }
            }

            // We failed, so open the default
            midiDevice.openPort(defaultIfFail);

            return defaultIfFail;
        }

    }

}

module.exports = {
    Utils,
};
