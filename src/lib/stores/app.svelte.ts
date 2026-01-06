import { Chord } from 'tonal';
import { SvelteSet } from 'svelte/reactivity';
import { FormatUtil, type Mode } from '$lib/utils/format.util';
import { VoicingUtil } from '$lib/utils/voicing.util';

// Re-export types
export type { Mode };

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');
let selectedChord = $state<string | null>(null);
let selectedInversion = $state<0 | 1 | 2>(0);
let pianoStartOctave = $state(2);
let chordDisplayOctave = $state(3); // Default octave for chord display (C3)
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

	set selectedInversion(value: 0 | 1 | 2) {
		selectedInversion = value;
	},

	/**
	 * Select a chord with optional inversion and toggle behavior.
	 * Consolidates chord selection logic used across components.
	 * @param chord - Chord symbol to select, or null to deselect
	 * @param inversion - Inversion level (0, 1, or 2)
	 * @param toggle - If true, deselects if the same chord/inversion is already selected
	 */
	selectChord(chord: string | null, inversion: 0 | 1 | 2 = 0, toggle = false) {
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

	// Add a note to the pressed set (format: "C4", "F#3", etc.)
	addPressedNote(note: string, octave: number) {
		pressedNotes.add(`${note}${octave}`);
	},

	// Remove a note from the pressed set
	removePressedNote(note: string, octave: number) {
		pressedNotes.delete(`${note}${octave}`);
	},

	// Add multiple notes at once (for chords)
	addPressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.add(`${n.note}${n.octave}`);
		}
	},

	// Remove multiple notes at once (for chords)
	removePressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.delete(`${n.note}${n.octave}`);
		}
	},

	clearPressedNotes() {
		pressedNotes.clear();
	},

	get isChordPressed() {
		return isChordPressed;
	},

	set isChordPressed(value: boolean) {
		isChordPressed = value;
	},

	// Get the notes that should be highlighted on the piano based on pressed keys
	// Returns array of {note, octave} objects
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }> {
		const results: Array<{ note: string; octave: number }> = [];

		// Chord highlighting from degree key (1-7)
		if (pressedDegree !== null) {
			const chord = VoicingUtil.getChordForDegree(pressedDegree, selectedRoot, mode);
			if (chord && chord.notes.length) {
				results.push(
					...VoicingUtil.getVoicedNotes(chord.notes, selectedInversion, chordDisplayOctave)
				);
			}
		}

		// Chord highlighting from Circle of Fifths mouse interaction
		if (isChordPressed && selectedChord) {
			const chordSymbol = FormatUtil.unformatNote(selectedChord);
			const chord = Chord.get(chordSymbol);
			if (!chord.empty && chord.notes.length) {
				results.push(
					...VoicingUtil.getVoicedNotes(chord.notes, selectedInversion, chordDisplayOctave)
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
