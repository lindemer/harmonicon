import { Key, Chord, Progression, Note } from 'tonal';

// Tonal's Chord type
export type ChordType = ReturnType<typeof Chord.get>;

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');

export const musicState = {
	get selectedRoot() {
		return selectedRoot;
	},

	set selectedRoot(value: string) {
		selectedRoot = value;
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
	}
};
