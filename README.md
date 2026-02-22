# midi-live-performer
Real-time MIDI control and playback for NodeJS fans

# Examples

Every example builds on the previous, each moving towards 'best practise'. Therefore, I suggest you work through them
in the order:

* midi-dump
* midi-echo
* pss
* strummer
* looper



# Fluidsynth cheat sheet

```
$ fluidsynth
load "sf2/4gmgsmt.sf2"
load "sf2/HS Linn Drums.sf2"
```
Then assign the first few channels to general MIDI, and channel 9 to drums.
(pattern is `select [channel] [font] [bank] [patch]`)
```
select 0 1 0 0
select 1 1 0 34
select 2 1 0 56
select 3 1 0 76
select 9 2 0 0
```

Confirm this with:
```
channels
```

# Learn more

I have a talk on this project at https://fosdem.org/2026/schedule/event/FE7Y87-midi_live_performer/

# Hear more

My music, often spawned from loops and algorithms created from this project can be found at https://nodemusic.bandcamp.com/music
