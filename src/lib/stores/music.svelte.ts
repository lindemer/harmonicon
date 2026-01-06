import { Key, Chord, Progression, Note } from 'tonal';
import { SvelteSet } from 'svelte/reactivity';
import { FormatUtil, type Mode } from '$lib/utils/format';

// Re-export types
export type { Mode };
export type ChordType = ReturnType<typeof Chord.get>;
export type TimeSignature = { top: number; bottom: number };
export type Clef = 'treble' | 'bass';

// Supported time signatures grouped by bottom number
const TIME_SIG_TOPS_BY_BOTTOM: Record<number, number[]> = {
	4: [2, 3, 4, 5, 7], // sorted least to greatest
	8: [6, 9, 12] // sorted least to greatest
};

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');
let wheelLocked = $state(false);
let selectedChord = $state<string | null>(null);
let selectedInversion = $state<0 | 1 | 2>(0);
let timeSignatureBottom = $state(4);
let timeSignatureTop = $state(4);
let clef = $state<Clef>('treble');
let pianoStartOctave = $state(2);
let chordDisplayOctave = $state(3); // Default octave for chord display (C3)
let pressedDegree = $state<number | null>(null);
let isChordPressed = $state(false);

// Track all currently pressed notes as "{note}{octave}" strings (e.g., "C4", "F#3")
const pressedNotes = new SvelteSet<string>();

export const musicState = {
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

	get wheelLocked() {
		return wheelLocked;
	},

	set wheelLocked(value: boolean) {
		wheelLocked = value;
	},

	toggleWheelLocked() {
		wheelLocked = !wheelLocked;
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

	get timeSignatureTop() {
		return timeSignatureTop;
	},

	get timeSignatureBottom() {
		return timeSignatureBottom;
	},

	get timeSignature(): TimeSignature {
		return { top: timeSignatureTop, bottom: timeSignatureBottom };
	},

	// Cycle through allowed top numbers for the current bottom number
	cycleTimeSignatureTop() {
		const tops = TIME_SIG_TOPS_BY_BOTTOM[timeSignatureBottom];
		const currentIndex = tops.indexOf(timeSignatureTop);
		timeSignatureTop = tops[(currentIndex + 1) % tops.length];
	},

	// Toggle between 4 and 8, setting appropriate default top number
	cycleTimeSignatureBottom() {
		if (timeSignatureBottom === 4) {
			timeSignatureBottom = 8;
			timeSignatureTop = 6; // Default for /8
		} else {
			timeSignatureBottom = 4;
			timeSignatureTop = 4; // Default for /4
		}
	},

	get clef() {
		return clef;
	},

	set clef(value: Clef) {
		clef = value;
	},

	toggleClef() {
		clef = clef === 'treble' ? 'bass' : 'treble';
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

	// Get the root note for the current key
	// In major mode: selectedRoot (e.g., C)
	// In minor mode: relative minor of selectedRoot (e.g., Am for C)
	get tonicRoot(): string {
		return FormatUtil.getTonicRoot(selectedRoot, mode);
	},

	// Get the roman numeral for a chord in the current key
	// Accepts chord symbols like 'C', 'Dm', 'F#m', 'Bdim'
	getRomanNumeral(chordSymbol: string): string | null {
		const result = Progression.toRomanNumerals(selectedRoot, [chordSymbol]);
		return result[0] || null;
	},

	// Get the scale degree (1-7) for a chord in the current key, or null if not diatonic
	// Accepts chord symbols like 'C', 'Dm', 'F#m', 'Bdim'
	getScaleDegree(chordSymbol: string): number | null {
		return FormatUtil.getChordDegree(chordSymbol, selectedRoot, mode);
	},

	// Get the chord for a given scale degree in the current key
	// Returns Tonal Chord object
	getChordForDegree(degree: number): ChordType | null {
		if (degree < 1 || degree > 7) return null;

		// Get triads based on current mode
		// In minor mode, use the relative minor (e.g., Am for C)
		const triads =
			mode === 'major'
				? Key.majorKey(selectedRoot).triads
				: Key.minorKey(Key.majorKey(selectedRoot).minorRelative).natural.triads;

		const triad = triads[degree - 1];
		return Chord.get(triad);
	},

	// Get the scale degree (1-7) for a single note in the MAJOR key
	// Always uses selectedRoot regardless of mode - used for consistent coloring
	// Returns null if not in the major scale
	getMajorDegree(noteName: string): number | null {
		return FormatUtil.getNoteDegreeInMajorKey(noteName, selectedRoot);
	},

	// Get the scale degree (1-7) for a single note in the current key
	// Returns null if not in the scale
	// Uses tonicRoot so minor mode is relative to the relative minor
	getNoteDegree(noteName: string): number | null {
		return FormatUtil.getNoteDegree(noteName, selectedRoot, mode);
	},

	// Get the roman numeral for a note in the current key
	// Returns properly formatted numeral (e.g., 'I', 'ii', '♭III', 'vii°')
	getNoteRomanNumeral(noteName: string): string | null {
		const degree = this.getNoteDegree(noteName);
		if (degree) {
			return FormatUtil.getDiatonicRomanNumeral(degree, mode);
		}
		return null;
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
	// Voices chords so root is closest to the base octave's C (above or below)
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }> {
		const results: Array<{ note: string; octave: number }> = [];

		// Chord highlighting from degree key (1-7)
		if (pressedDegree !== null) {
			const chord = this.getChordForDegree(pressedDegree);
			if (chord && chord.notes.length) {
				const chordNotes = chord.notes;
				const inversion = selectedInversion;
				const baseOctave = chordDisplayOctave;

				// Reorder notes based on inversion
				const invertedNotes = [...chordNotes.slice(inversion), ...chordNotes.slice(0, inversion)];
				const bassNote = invertedNotes[0];
				const bassChroma = Note.chroma(bassNote);
				if (bassChroma !== undefined) {
					// Place bass note closest to the base octave's C
					// If chroma > 6 (F# to B), place in octave below (closer to C going down)
					// If chroma <= 6 (C to F), place in base octave (closer to C going up)
					const bassOctave = bassChroma > 6 ? baseOctave - 1 : baseOctave;

					for (const noteName of invertedNotes) {
						const noteChroma = Note.chroma(noteName);
						if (noteChroma === undefined) {
							results.push({ note: noteName, octave: bassOctave });
						} else {
							// Notes with chroma < bass go up an octave (voiced above bass)
							const octave = noteChroma < bassChroma ? bassOctave + 1 : bassOctave;
							results.push({ note: noteName, octave });
						}
					}
				}
			}
		}

		// Chord highlighting from Circle of Fifths mouse interaction
		if (isChordPressed && selectedChord) {
			const chordSymbol = FormatUtil.unformatNote(selectedChord);
			const chord = Chord.get(chordSymbol);
			if (!chord.empty && chord.notes.length) {
				const chordNotes = chord.notes;
				const inversion = selectedInversion;
				const baseOctave = chordDisplayOctave;

				// Reorder notes based on inversion
				const invertedNotes = [...chordNotes.slice(inversion), ...chordNotes.slice(0, inversion)];
				const bassNote = invertedNotes[0];
				const bassChroma = Note.chroma(bassNote);
				if (bassChroma !== undefined) {
					// Place bass note closest to the base octave's C
					const bassOctave = bassChroma > 6 ? baseOctave - 1 : baseOctave;

					for (const noteName of invertedNotes) {
						const noteChroma = Note.chroma(noteName);
						if (noteChroma === undefined) {
							results.push({ note: noteName, octave: bassOctave });
						} else {
							const octave = noteChroma < bassChroma ? bassOctave + 1 : bassOctave;
							results.push({ note: noteName, octave });
						}
					}
				}
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
