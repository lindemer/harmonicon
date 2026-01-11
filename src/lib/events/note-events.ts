/**
 * Note Events System
 *
 * Provides a decoupled event system for note on/off events.
 * This breaks the circular dependency between appState and midiState:
 *
 * Before: appState -> midiState (direct call)
 * After:  appState -> noteEvents (publish) <- midiState (subscribe)
 *
 * Note events flow:
 * - UI/Keyboard input -> appState.addPressedNote() -> publishes NoteOn -> midiState sends MIDI
 * - MIDI input -> midiState receives -> appState.addPressedNoteFromMidi() (no event, visual only)
 */

export interface NoteInfo {
	note: string;
	octave: number;
}

export type NoteEventType = 'note-on' | 'note-off';

export interface NoteEvent {
	type: NoteEventType;
	note: string;
	octave: number;
	velocity?: number;
}

type NoteEventHandler = (event: NoteEvent) => void;

// Subscribers list
const subscribers: NoteEventHandler[] = [];

/**
 * Subscribe to note events.
 * Returns an unsubscribe function.
 */
export function subscribeToNoteEvents(handler: NoteEventHandler): () => void {
	subscribers.push(handler);
	return () => {
		const index = subscribers.indexOf(handler);
		if (index > -1) {
			subscribers.splice(index, 1);
		}
	};
}

/**
 * Publish a note-on event.
 * Called when a note is pressed via UI/keyboard (not MIDI input).
 */
export function publishNoteOn(note: string, octave: number, velocity: number = 80): void {
	const event: NoteEvent = { type: 'note-on', note, octave, velocity };
	for (const handler of subscribers) {
		handler(event);
	}
}

/**
 * Publish a note-off event.
 * Called when a note is released via UI/keyboard (not MIDI input).
 */
export function publishNoteOff(note: string, octave: number): void {
	const event: NoteEvent = { type: 'note-off', note, octave };
	for (const handler of subscribers) {
		handler(event);
	}
}

/**
 * Publish multiple note-on events (for chords).
 */
export function publishNotesOn(notes: NoteInfo[], velocity: number = 80): void {
	for (const { note, octave } of notes) {
		publishNoteOn(note, octave, velocity);
	}
}

/**
 * Publish multiple note-off events (for chords).
 */
export function publishNotesOff(notes: NoteInfo[]): void {
	for (const { note, octave } of notes) {
		publishNoteOff(note, octave);
	}
}
