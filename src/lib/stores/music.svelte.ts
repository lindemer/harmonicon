import { Key, Chord, Progression, Note } from 'tonal';

// Tonal's Chord type
export type ChordType = ReturnType<typeof Chord.get>;
export type Mode = 'major' | 'minor';

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');

// Roman numeral formatting for each scale degree
// Major: I, ii, iii, IV, V, vi, vii°
// Minor (natural): i, ii°, ♭III, iv, v, ♭VI, ♭VII
const majorNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const minorNumerals = ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII'];

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

	// Get the root note for the current mode's perspective
	// In major mode: selectedRoot (e.g., C)
	// In minor mode: relative minor of selectedRoot (e.g., A for C major)
	get tonicRoot(): string {
		if (mode === 'major') {
			return selectedRoot;
		}
		return Key.majorKey(selectedRoot).minorRelative;
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
		const key = Key.majorKey(selectedRoot);
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.tonic) return null;

		const chordChroma = Note.chroma(chord.tonic);

		// Find matching triad by comparing pitch class (chroma) and quality
		const degreeIndex = key.triads.findIndex((triad) => {
			const triadChord = Chord.get(triad);
			const triadChroma = Note.chroma(triadChord.tonic!);
			return triadChroma === chordChroma && triadChord.quality === chord.quality;
		});

		return degreeIndex === -1 ? null : degreeIndex + 1;
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
		const scale = Key.majorKey(selectedRoot).scale;

		const noteChroma = Note.chroma(noteName);
		if (noteChroma === undefined) return null;

		const degreeIndex = scale.findIndex((scaleNote) => {
			return Note.chroma(scaleNote) === noteChroma;
		});

		return degreeIndex === -1 ? null : degreeIndex + 1;
	},

	// Get the scale degree (1-7) for a single note in the current key
	// Returns null if not in the scale
	// Uses tonicRoot so minor mode is relative to the relative minor
	getNoteDegree(noteName: string): number | null {
		const tonic = this.tonicRoot;
		const scale =
			mode === 'major'
				? Key.majorKey(tonic).scale
				: Key.minorKey(tonic).natural.scale;

		const noteChroma = Note.chroma(noteName);
		if (noteChroma === undefined) return null;

		const degreeIndex = scale.findIndex((scaleNote) => {
			return Note.chroma(scaleNote) === noteChroma;
		});

		return degreeIndex === -1 ? null : degreeIndex + 1;
	},

	// Get the roman numeral for a note in the current key
	// Returns properly formatted numeral (e.g., 'I', 'ii', '♭III', 'vii°')
	getNoteRomanNumeral(noteName: string): string | null {
		const degree = this.getNoteDegree(noteName);
		if (degree) {
			// Diatonic note - use proper formatting
			const numerals = mode === 'major' ? majorNumerals : minorNumerals;
			return numerals[degree - 1];
		}

		// Non-diatonic notes don't get labels
		return null;
	}
};
