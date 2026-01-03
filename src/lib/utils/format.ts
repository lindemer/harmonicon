import { Key, Chord, Note } from 'tonal';

export type Mode = 'major' | 'minor';

/**
 * Centralized utility class for music notation formatting and theory computations.
 * All methods are static for easy namespacing.
 */
export class FormatUtil {
	// === Constants ===

	/** Roman numerals for major key scale degrees (I, ii, iii, IV, V, vi, vii°) */
	static readonly MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] as const;

	/** Roman numerals for natural minor key scale degrees (i, ii°, ♭III, iv, v, ♭VI, ♭VII) */
	static readonly MINOR_NUMERALS = ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII'] as const;

	/** Roman numerals for all 12 chromatic scale degrees from root */
	static readonly CHROMATIC_NUMERALS = [
		'I',
		'♯I/♭II',
		'II',
		'♯II/♭III',
		'III',
		'IV',
		'♯IV/♭V',
		'V',
		'♯V/♭VI',
		'VI',
		'♯VI/♭VII',
		'VII'
	] as const;

	/** Circle of fifths order for visual layout */
	static readonly CIRCLE_OF_FIFTHS = [
		'C',
		'G',
		'D',
		'A',
		'E',
		'B',
		'Gb',
		'Db',
		'Ab',
		'Eb',
		'Bb',
		'F'
	] as const;

	// === Note/Chord Formatting ===

	/**
	 * Format note names with proper music symbols.
	 * Converts ASCII accidentals to Unicode: # → ♯, b → ♭
	 */
	static formatNote(note: string): string {
		return note.replace('#', '♯').replace(/([A-Ga-g])b/g, '$1♭');
	}

	/**
	 * Convert formatted note/chord names back to Tonal notation.
	 * Converts Unicode accidentals to ASCII: ♯ → #, ♭ → b, ° → dim
	 */
	static unformatNote(note: string): string {
		return note.replace('♯', '#').replace('♭', 'b').replace('°', 'dim');
	}

	/**
	 * Format interval from Tonal notation to display format.
	 * Converts: 1P, 3m, 3M, 5P → P1, m3, M3, P5
	 */
	static formatInterval(interval: string): string {
		const num = interval.match(/\d+/)?.[0] ?? '';
		const quality = interval.match(/[PmMdA]/)?.[0] ?? '';
		return quality + num;
	}

	// === Key/Tonic Helpers ===

	/**
	 * Get the tonic root for a given selected root and mode.
	 * In major mode: returns selectedRoot (e.g., C)
	 * In minor mode: returns relative minor of selectedRoot (e.g., A for C)
	 */
	static getTonicRoot(selectedRoot: string, mode: Mode): string {
		if (mode === 'major') {
			return selectedRoot;
		}
		return Key.majorKey(selectedRoot).minorRelative;
	}

	// === Scale Degree Computations ===

	/**
	 * Get the scale degree (1-7) for a chord in a given key and mode.
	 * Returns null if the chord is not diatonic to the key.
	 */
	static getChordDegree(chordSymbol: string, keyRoot: string, mode: Mode): number | null {
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.tonic) return null;

		const chordChroma = Note.chroma(chord.tonic);
		const tonic = this.getTonicRoot(keyRoot, mode);
		const triads = mode === 'major' ? Key.majorKey(tonic).triads : Key.minorKey(tonic).natural.triads;

		const degreeIndex = triads.findIndex((triad) => {
			const triadChord = Chord.get(triad);
			const triadChroma = Note.chroma(triadChord.tonic!);
			return triadChroma === chordChroma && triadChord.quality === chord.quality;
		});

		return degreeIndex === -1 ? null : degreeIndex + 1;
	}

	/**
	 * Get the scale degree (1-7) for a chord in a major key only.
	 * Used for consistent wheel coloring regardless of mode.
	 */
	static getChordDegreeInMajorKey(chordSymbol: string, keyRoot: string): number | null {
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.tonic) return null;

		const chordChroma = Note.chroma(chord.tonic);
		const triads = Key.majorKey(keyRoot).triads;

		const degreeIndex = triads.findIndex((triad) => {
			const triadChord = Chord.get(triad);
			const triadChroma = Note.chroma(triadChord.tonic!);
			return triadChroma === chordChroma && triadChord.quality === chord.quality;
		});

		return degreeIndex === -1 ? null : degreeIndex + 1;
	}

	/**
	 * Get the scale degree (1-7) for a single note in a given key and mode.
	 * Returns null if the note is not in the scale.
	 */
	static getNoteDegree(noteName: string, keyRoot: string, mode: Mode): number | null {
		const tonic = this.getTonicRoot(keyRoot, mode);
		const scale = mode === 'major' ? Key.majorKey(tonic).scale : Key.minorKey(tonic).natural.scale;

		const noteChroma = Note.chroma(noteName);
		if (noteChroma === undefined) return null;

		const degreeIndex = scale.findIndex((scaleNote) => {
			return Note.chroma(scaleNote) === noteChroma;
		});

		return degreeIndex === -1 ? null : degreeIndex + 1;
	}

	/**
	 * Get the scale degree (1-7) for a single note in a major key only.
	 * Used for consistent coloring regardless of mode.
	 */
	static getNoteDegreeInMajorKey(noteName: string, keyRoot: string): number | null {
		const scale = Key.majorKey(keyRoot).scale;

		const noteChroma = Note.chroma(noteName);
		if (noteChroma === undefined) return null;

		const degreeIndex = scale.findIndex((scaleNote) => {
			return Note.chroma(scaleNote) === noteChroma;
		});

		return degreeIndex === -1 ? null : degreeIndex + 1;
	}

	// === Roman Numeral Generation ===

	/**
	 * Get the roman numeral for a diatonic scale degree (1-7).
	 */
	static getDiatonicRomanNumeral(degree: number, mode: Mode): string {
		const numerals = mode === 'major' ? this.MAJOR_NUMERALS : this.MINOR_NUMERALS;
		return numerals[degree - 1];
	}

	/**
	 * Get the roman numeral for a chord, handling both diatonic and chromatic cases.
	 * Returns the numeral and whether it's diatonic.
	 */
	static getChordRomanNumeral(
		chordSymbol: string,
		keyRoot: string,
		mode: Mode
	): { numeral: string; isDiatonic: boolean } | null {
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.tonic) return null;

		// First check if it's diatonic
		const degree = this.getChordDegree(chordSymbol, keyRoot, mode);
		if (degree) {
			return { numeral: this.getDiatonicRomanNumeral(degree, mode), isDiatonic: true };
		}

		// Non-diatonic chord - compute from chromatic position
		const tonic = this.getTonicRoot(keyRoot, mode);
		const tonicChroma = Note.chroma(tonic);
		const chordChroma = Note.chroma(chord.tonic);
		if (tonicChroma === undefined || chordChroma === undefined) return null;

		const semitones = (chordChroma - tonicChroma + 12) % 12;
		let base: string = this.CHROMATIC_NUMERALS[semitones];

		// Simplify the numeral based on the chord's accidental
		if (base.includes('/')) {
			const chordRoot = chord.tonic;
			if (chordRoot.includes('#')) {
				base = base.split('/')[0]; // Use sharp version
			} else {
				base = base.split('/')[1]; // Use flat version
			}
		}

		// Adjust case based on chord quality
		if (chord.quality === 'Minor' || chord.quality === 'Diminished') {
			base = base.toLowerCase();
		}

		// Add quality suffix for diminished
		if (chord.quality === 'Diminished') {
			base += '°';
		}

		return { numeral: base, isDiatonic: false };
	}

	// === Color ===

	/**
	 * Get CSS variable for a scale degree (1-7).
	 * Returns fallback color for null/undefined degrees.
	 * @param hover - If true, returns the hover variant color
	 */
	static getDegreeColor(degree: number | null, fallback = '#1f2937', hover = false): string {
		if (!degree) return fallback;
		return hover ? `var(--degree-${degree}-hover)` : `var(--degree-${degree})`;
	}

	/**
	 * Convert semitones to figured bass interval notation.
	 * Used for displaying intervals relative to bass note in inversions.
	 */
	static formatFiguredBassInterval(semitones: number): string {
		const intervals: Record<number, string> = {
			0: 'P1',
			1: 'm2',
			2: 'M2',
			3: 'm3',
			4: 'M3',
			5: 'P4',
			6: 'TT',
			7: 'P5',
			8: 'm6',
			9: 'M6',
			10: 'm7',
			11: 'M7'
		};
		return intervals[semitones] ?? String(semitones);
	}
}
