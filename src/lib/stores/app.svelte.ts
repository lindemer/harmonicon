import { Chord } from 'tonal';
import { SvelteSet } from 'svelte/reactivity';
import { FormatUtil } from '$lib/utils/format.util';
import { VoicingUtil } from '$lib/utils/voicing.util';
import { audioState } from './audio.svelte';
import type { Mode, VoicingMode } from '$lib/types';

// ============ AppState Interface ============

export interface AppState {
	// Key/Mode selection
	selectedRoot: string;
	mode: Mode;
	toggleMode(): void;

	// Chord selection
	selectedChord: string | null;
	selectedInversion: 0 | 1 | 2 | 3;
	isSeventhMode: boolean;
	selectChord(chord: string | null, inversion?: 0 | 1 | 2 | 3, toggle?: boolean): void;

	// Octave control
	pianoStartOctave: number;
	chordDisplayOctave: number;
	incrementChordOctave(): void;
	decrementChordOctave(): void;

	// Voicing mode
	voicingMode: VoicingMode;
	setVoicingMode(mode: VoicingMode): void;

	// Pressed state (visual + audio)
	pressedDegree: number | null;
	pressedNotes: SvelteSet<string>;
	addPressedNote(note: string, octave: number): void;
	removePressedNote(note: string, octave: number): void;
	addPressedNotes(notes: Array<{ note: string; octave: number }>): void;
	removePressedNotes(notes: Array<{ note: string; octave: number }>): void;
	clearPressedNotes(): void;

	// Circle of Fifths interaction state
	isChordPressed: boolean;

	// Audio mute
	isMuted: boolean;
	setMuted(value: boolean): void;
	toggleMuted(): void;

	// Derived
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }>;
}

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');
let selectedChord = $state<string | null>(null);
let selectedInversion = $state<0 | 1 | 2 | 3>(0);
let isSeventhMode = $state(false);
let pianoStartOctave = $state(2);
let chordDisplayOctave = $state(3); // Default octave for chord display (C3)
let voicingMode = $state<VoicingMode>('open');
let pressedDegree = $state<number | null>(null);
let isChordPressed = $state(false);

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

	get selectedChord() {
		return selectedChord;
	},

	set selectedChord(value: string | null) {
		selectedChord = value;
		selectedInversion = 0; // Reset inversion when chord changes
	},

	get selectedInversion() {
		return selectedInversion;
	},

	set selectedInversion(value: 0 | 1 | 2 | 3) {
		selectedInversion = value;
	},

	get isSeventhMode() {
		return isSeventhMode;
	},

	set isSeventhMode(value: boolean) {
		isSeventhMode = value;
	},

	/**
	 * Select a chord with optional inversion and toggle behavior.
	 * Consolidates chord selection logic used across components.
	 * @param chord - Chord symbol to select, or null to deselect
	 * @param inversion - Inversion level (0, 1, or 2)
	 * @param toggle - If true, deselects if the same chord/inversion is already selected
	 */
	selectChord(chord: string | null, inversion: 0 | 1 | 2 | 3 = 0, toggle = false) {
		if (toggle && selectedChord === chord && selectedInversion === inversion) {
			selectedChord = null;
			selectedInversion = 0;
		} else {
			selectedChord = chord;
			selectedInversion = inversion;
		}
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

	// Add a note to the pressed set and play audio
	addPressedNote(note: string, octave: number) {
		pressedNotes.add(`${note}${octave}`);
		audioState.playNote(note, octave);
	},

	// Remove a note from the pressed set and stop audio
	removePressedNote(note: string, octave: number) {
		pressedNotes.delete(`${note}${octave}`);
		audioState.stopNote(note, octave);
	},

	// Add multiple notes at once (for chords) and play audio
	addPressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.add(`${n.note}${n.octave}`);
		}
		audioState.playNotes(notes);
	},

	// Remove multiple notes at once (for chords) and stop audio
	removePressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.delete(`${n.note}${n.octave}`);
		}
		audioState.stopNotes(notes);
	},

	// Clear all pressed notes and stop all audio
	clearPressedNotes() {
		pressedNotes.clear();
		audioState.stopAllNotes();
	},

	get isChordPressed() {
		return isChordPressed;
	},

	set isChordPressed(value: boolean) {
		isChordPressed = value;
	},

	// Audio mute controls
	get isMuted() {
		return audioState.muted;
	},

	setMuted(value: boolean) {
		if (value) {
			this.clearPressedNotes();
		}
		audioState.muted = value;
	},

	toggleMuted() {
		this.setMuted(!audioState.muted);
	},

	// Get the notes that should be highlighted on the piano based on pressed keys
	// Returns array of {note, octave} objects
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }> {
		const results: Array<{ note: string; octave: number }> = [];

		// Chord highlighting from degree key (1-7)
		if (pressedDegree !== null) {
			const chord = isSeventhMode
				? VoicingUtil.getSeventhChordForDegree(pressedDegree, selectedRoot, mode)
				: VoicingUtil.getChordForDegree(pressedDegree, selectedRoot, mode);
			if (chord && chord.notes.length) {
				results.push(
					...VoicingUtil.getVoicedNotes(chord.notes, selectedInversion, chordDisplayOctave, voicingMode)
				);
			}
		}

		// Chord highlighting from Circle of Fifths mouse interaction
		if (isChordPressed && selectedChord) {
			const chordSymbol = FormatUtil.unformatNote(selectedChord);
			const chord = Chord.get(chordSymbol);
			if (!chord.empty && chord.notes.length) {
				results.push(
					...VoicingUtil.getVoicedNotes(chord.notes, selectedInversion, chordDisplayOctave, voicingMode)
				);
			}
		}

		// Notes from pressedNotes set (keyboard keys, chords, etc.)
		for (const noteStr of pressedNotes) {
			// Parse "C4" -> { note: "C", octave: 4 } or "F#3" -> { note: "F#", octave: 3 }
			const match = noteStr.match(/^([A-G]#?)(\d+)$/);
			if (match) {
				results.push({ note: match[1], octave: parseInt(match[2]) });
			}
		}

		return results;
	}
};
