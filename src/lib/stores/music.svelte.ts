import { Key, Chord, Progression } from 'tonal';
import { FormatUtil, type Mode } from '$lib/utils/format';

// Re-export types
export type { Mode };
export type ChordType = ReturnType<typeof Chord.get>;

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');
let wheelLocked = $state(false);
let selectedChord = $state<string | null>(null);

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
