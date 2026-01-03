import { Key, Chord, Progression } from 'tonal';
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

const BOTTOM_OPTIONS = [4, 8];

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
		if (chordDisplayOctave > 2) chordDisplayOctave--;
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

		const key = Key.majorKey(selectedRoot);
		const triad = key.triads[degree - 1];

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
	}
};
