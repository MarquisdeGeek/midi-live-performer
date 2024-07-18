
/** Real-time MIDI playback */
const Sequencer = require('./sequencer').Sequencer;

/** Keyboard input and basic parsing */
const Keyboard = require('./keyboard').Keyboard;

/** MIDI message */
const MIDIMessage = require('./midi_message').MIDIMessage;

/** MIDI message queue handling */
const MIDIMessageQueue = require('./midi_message_queue').MIDIMessageQueue;

module.exports = {

    Sequencer,
    Keyboard,
    MIDIMessage,
    MIDIMessageQueue,
};
