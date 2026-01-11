/**
 * Application State Store
 *
 * Central state management for the Harmonicon app.
 * This is the "source of truth" for:
 * - Key/mode selection (selectedRoot, mode)
 * - Currently pressed notes (pressedNotes)
 * - Chord detection (derived from pressedNotes)
 * - Display settings (voicingMode, playMode, octave)
 *
 * Data flow:
 * - Input (keyboard/mouse/MIDI) -> keyboardState -> appState.addPressedNote()
 * - appState publishes note events -> midiState sends MIDI output
 * - MIDI input -> midiState -> appState.addPressedNoteFromMidi() (no MIDI echo)
 *
 * Note: This store does NOT directly import midiState to avoid circular deps.
 * MIDI output is handled via the note-events pub/sub system.
 */

import { SvelteSet } from 'svelte/reactivity';
import { ChordUtil, type DetectedChord } from '$lib/utils/chord.util';
import {
	publishNoteOn,
	publishNoteOff,
	publishNotesOn,
	publishNotesOff
} from '$lib/events/note-events';
import type { Mode, VoicingMode, PlayMode } from '$lib/types';

// Re-export DetectedChord type for consumers
export type { DetectedChord };

export interface AppState {
	// Key/Mode selection
	selectedRoot: string;
	mode: Mode;
	toggleMode(): void;

	// Chord detection (derived from pressed notes)
	detectedChord: DetectedChord | null;

	// Chord mode (for keyboard visual feedback)
	isSeventhMode: boolean;
	isNinthMode: boolean;

	// Octave control
	pianoStartOctave: number;
	chordDisplayOctave: number;
	incrementChordOctave(): void;
	decrementChordOctave(): void;

	// Voicing mode
	voicingMode: VoicingMode;
	setVoicingMode(mode: VoicingMode): void;
	toggleVoicingMode(): void;

	// Play mode (notes vs chords for letter keys)
	playMode: PlayMode;
	togglePlayMode(): void;

	// Pressed state (visual + MIDI)
	pressedDegree: number | null;
	pressedNotes: SvelteSet<string>;
	addPressedNote(note: string, octave: number): void;
	removePressedNote(note: string, octave: number): void;
	addPressedNoteFromMidi(note: string, octave: number): void;
	removePressedNoteFromMidi(note: string, octave: number): void;
	addPressedNotes(notes: Array<{ note: string; octave: number }>): void;
	removePressedNotes(notes: Array<{ note: string; octave: number }>): void;
	clearPressedNotes(): void;

	// Derived
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }>;
}

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');
let isSeventhMode = $state(false);
let isNinthMode = $state(false);
let pianoStartOctave = $state(2);
let chordDisplayOctave = $state(3); // Default octave for chord display (C3)
let voicingMode = $state<VoicingMode>('open');
let playMode = $state<PlayMode>('notes');
let pressedDegree = $state<number | null>(null);

// Track all currently pressed notes as "{note}{octave}" strings (e.g., "C4", "F#3")
const pressedNotes = new SvelteSet<string>();

export const appState = {
	get selectedRoot() {
		return selectedRoot;
	},

	set selectedRoot(value: string) {
		selectedRoot = value;
	},

	get mode() {
		return mode;
	},

	set mode(value: Mode) {
		mode = value;
	},

	toggleMode() {
		mode = mode === 'major' ? 'minor' : 'major';
	},

	// Detect chord from all currently pressed notes (across all octaves)
	get detectedChord(): DetectedChord | null {
		return ChordUtil.detectChord(pressedNotes);
	},

	get isSeventhMode() {
		return isSeventhMode;
	},

	set isSeventhMode(value: boolean) {
		isSeventhMode = value;
	},

	get isNinthMode() {
		return isNinthMode;
	},

	set isNinthMode(value: boolean) {
		isNinthMode = value;
	},

	get pianoStartOctave() {
		return pianoStartOctave;
	},

	set pianoStartOctave(value: number) {
		pianoStartOctave = value;
	},

	get chordDisplayOctave() {
		return chordDisplayOctave;
	},

	incrementChordOctave() {
		if (chordDisplayOctave < 5) chordDisplayOctave++;
	},

	decrementChordOctave() {
		if (chordDisplayOctave > 3) chordDisplayOctave--;
	},

	get voicingMode() {
		return voicingMode;
	},

	setVoicingMode(mode: VoicingMode) {
		voicingMode = mode;
	},

	toggleVoicingMode() {
		voicingMode = voicingMode === 'open' ? 'closed' : 'open';
	},

	get playMode() {
		return playMode;
	},

	togglePlayMode() {
		playMode = playMode === 'notes' ? 'chords' : 'notes';
	},

	// Pressed key state for visual feedback
	get pressedDegree() {
		return pressedDegree;
	},

	set pressedDegree(value: number | null) {
		pressedDegree = value;
	},

	get pressedNotes() {
		return pressedNotes;
	},

	// Add a note from UI/keyboard and publish event for MIDI OUT
	addPressedNote(note: string, octave: number) {
		pressedNotes.add(`${note}${octave}`);
		publishNoteOn(note, octave);
	},

	// Remove a note from UI/keyboard and publish event for MIDI OFF
	removePressedNote(note: string, octave: number) {
		pressedNotes.delete(`${note}${octave}`);
		publishNoteOff(note, octave);
	},

	// Add a note from MIDI IN (visual only, no MIDI OUT)
	addPressedNoteFromMidi(note: string, octave: number) {
		pressedNotes.add(`${note}${octave}`);
	},

	// Remove a note from MIDI IN (visual only, no MIDI OUT)
	removePressedNoteFromMidi(note: string, octave: number) {
		pressedNotes.delete(`${note}${octave}`);
	},

	// Add multiple notes at once (for chords) and publish events for MIDI OUT
	addPressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.add(`${n.note}${n.octave}`);
		}
		publishNotesOn(notes);
	},

	// Remove multiple notes at once (for chords) and publish events for MIDI OFF
	removePressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.delete(`${n.note}${n.octave}`);
		}
		publishNotesOff(notes);
	},

	// Clear all pressed notes
	clearPressedNotes() {
		pressedNotes.clear();
	},

	// Get the notes that should be highlighted on the piano based on pressed notes
	// Returns array of {note, octave} objects
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }> {
		const results: Array<{ note: string; octave: number }> = [];

		// All notes are now in pressedNotes set (individual notes, chords, etc.)
		for (const noteStr of pressedNotes) {
			// Parse "C4" -> { note: "C", octave: 4 } or "F#3" -> { note: "F#", octave: 3 } or "Eb3" -> { note: "Eb", octave: 3 }
			const match = noteStr.match(/^([A-G][#b]?)(\d+)$/);
			if (match) {
				results.push({ note: match[1], octave: parseInt(match[2]) });
			}
		}

		return results;
	}
};
