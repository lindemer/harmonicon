import type { Mode, VoicingMode } from '$lib/types';
import { Key, Chord, Note } from 'tonal';

export type ChordType = ReturnType<typeof Chord.get>;

/**
 * Utility class for chord voicing and degree-to-chord lookups.
 * All methods are static with no state.
 */
export class VoicingUtil {
	/**
	 * Get the chord for a scale degree in a given key.
	 * @param degree - Scale degree (1-7)
	 * @param keyRoot - Root note of the key (e.g., 'C', 'G')
	 * @param mode - 'major' or 'minor'
	 * @returns Tonal Chord object or null if invalid degree
	 */
	static getChordForDegree(degree: number, keyRoot: string, mode: Mode): ChordType | null {
		if (degree < 1 || degree > 7) return null;

		// Get triads based on mode
		// In minor mode, use the relative minor (e.g., Am for C)
		const triads =
			mode === 'major'
				? Key.majorKey(keyRoot).triads
				: Key.minorKey(Key.majorKey(keyRoot).minorRelative).natural.triads;

		const triad = triads[degree - 1];
		return Chord.get(triad);
	}

	/**
	 * Get the 7th chord for a scale degree in a given key.
	 * @param degree - Scale degree (1-7)
	 * @param keyRoot - Root note of the key (e.g., 'C', 'G')
	 * @param mode - 'major' or 'minor'
	 * @returns Tonal Chord object or null if invalid degree
	 */
	static getSeventhChordForDegree(degree: number, keyRoot: string, mode: Mode): ChordType | null {
		if (degree < 1 || degree > 7) return null;

		// Get 7th chords based on mode
		// In minor mode, use the natural minor 7th chords
		const chords =
			mode === 'major'
				? Key.majorKey(keyRoot).chords
				: Key.minorKey(Key.majorKey(keyRoot).minorRelative).natural.chords;

		const chord = chords[degree - 1];
		return Chord.get(chord);
	}

	/**
	 * Get the 9th chord for a scale degree in a given key.
	 * Built by taking the 7th chord and adding the 9th (2nd scale degree above root).
	 * @param degree - Scale degree (1-7)
	 * @param keyRoot - Root note of the key (e.g., 'C', 'G')
	 * @param mode - 'major' or 'minor'
	 * @returns Tonal Chord object with 5 notes, or null if invalid degree
	 */
	static getNinthChordForDegree(degree: number, keyRoot: string, mode: Mode): ChordType | null {
		if (degree < 1 || degree > 7) return null;

		// Get the 7th chord first
		const seventhChord = this.getSeventhChordForDegree(degree, keyRoot, mode);
		if (!seventhChord || seventhChord.empty) return null;

		// Get the scale to find the 9th (which is the 2nd above the root, i.e., degree + 1 mod 7)
		const scale =
			mode === 'major'
				? Key.majorKey(keyRoot).scale
				: Key.minorKey(Key.majorKey(keyRoot).minorRelative).natural.scale;

		// The 9th is the note that is a 2nd above the chord root
		// For degree N, the 9th is scale degree (N + 1) mod 7 (0-indexed: degree itself in 0-6)
		const ninthDegreeIndex = degree % 7; // degree is 1-7, so this gives 1-7 then wraps to 0 for degree 7
		const ninthNote = scale[ninthDegreeIndex];

		// Create a new chord-like object with the 9th added
		// The notes array will be: [root, 3rd, 5th, 7th, 9th]
		const notes = [...seventhChord.notes, ninthNote];

		// Return a chord-like object
		return {
			...seventhChord,
			notes,
			intervals: [...seventhChord.intervals, '9M'], // Approximate - actual interval depends on chord quality
			name: seventhChord.name ? seventhChord.name.replace('7', '9') : ''
		};
	}

	/**
	 * Get voiced chord notes with octave information.
	 *
	 * @param chordNotes - Array of note names from Chord.get().notes
	 * @param inversion - 0 (root), 1 (first), 2 (second), or 3 (third for 7th chords)
	 * @param baseOctave - Base octave for voicing (e.g., 3)
	 * @param voicingMode - 'open' or 'closed' voicing style
	 * @returns Array of {note, octave} objects
	 */
	static getVoicedNotes(
		chordNotes: string[],
		inversion: 0 | 1 | 2 | 3,
		baseOctave: number,
		voicingMode: VoicingMode = 'open'
	): Array<{ note: string; octave: number }> {
		if (!chordNotes.length) return [];

		// Reorder notes based on inversion
		const invertedNotes = [...chordNotes.slice(inversion), ...chordNotes.slice(0, inversion)];

		const bassNote = invertedNotes[0];
		const bassChroma = Note.chroma(bassNote);

		if (bassChroma === undefined) {
			return invertedNotes.map((note) => ({ note, octave: baseOctave }));
		}

		if (voicingMode === 'closed') {
			return this.getClosedVoicing(invertedNotes, baseOctave);
		}

		return this.getOpenVoicing(invertedNotes, baseOctave);
	}

	/**
	 * Open voicing: bass in lower octave, harmony in upper octave.
	 */
	private static getOpenVoicing(
		invertedNotes: string[],
		baseOctave: number
	): Array<{ note: string; octave: number }> {
		const bassOctave = baseOctave - 1;

		return invertedNotes.map((noteName, index) => {
			if (index === 0) {
				// Bass note in lower octave
				return { note: noteName, octave: bassOctave };
			}
			// Harmony notes in upper octave
			return { note: noteName, octave: baseOctave };
		});
	}

	/**
	 * Closed voicing: all notes within the 2-octave range, bass placed closest to baseOctave's C.
	 * All notes must fit between C(baseOctave-1) and B(baseOctave).
	 */
	private static getClosedVoicing(
		invertedNotes: string[],
		baseOctave: number
	): Array<{ note: string; octave: number }> {
		const bassChroma = Note.chroma(invertedNotes[0]);
		if (bassChroma === undefined) {
			return invertedNotes.map((note) => ({ note, octave: baseOctave - 1 }));
		}

		// Calculate which octave places bass closest to C{baseOctave}
		// C{baseOctave} is our target reference point
		const targetC = 12 * baseOctave;
		const bassInLower = 12 * (baseOctave - 1) + bassChroma;
		const bassInUpper = 12 * baseOctave + bassChroma;

		let bassOctave =
			Math.abs(bassInLower - targetC) <= Math.abs(bassInUpper - targetC)
				? baseOctave - 1
				: baseOctave;

		// Place all notes ascending from bass, wrapping octave when chroma decreases
		let currentOctave = bassOctave;
		let prevChroma = bassChroma;

		const voicedNotes = invertedNotes.map((noteName, index) => {
			const noteChroma = Note.chroma(noteName);
			if (noteChroma === undefined) return { note: noteName, octave: currentOctave };

			if (index === 0) {
				return { note: noteName, octave: bassOctave };
			}

			// If chroma decreased or equal, we've wrapped around to next octave
			if (noteChroma <= prevChroma) {
				currentOctave++;
			}
			prevChroma = noteChroma;

			return { note: noteName, octave: currentOctave };
		});

		// Check if any note exceeds the ceiling (C of baseOctave+1, i.e., octave >= baseOctave+1)
		// If so, shift the entire chord down by one octave
		const ceiling = baseOctave;
		const anyAboveCeiling = voicedNotes.some((vn) => vn.octave > ceiling);

		if (anyAboveCeiling) {
			return voicedNotes.map((vn) => ({ note: vn.note, octave: vn.octave - 1 }));
		}

		return voicedNotes;
	}

	/**
	 * Get voiced notes from a chord symbol.
	 * Convenience method that parses the chord symbol first.
	 *
	 * @param chordSymbol - Chord symbol (e.g., 'C', 'Am', 'Bdim', 'Cmaj7')
	 * @param inversion - 0 (root), 1 (first), 2 (second), or 3 (third for 7th chords)
	 * @param baseOctave - Base octave for voicing
	 * @param voicingMode - 'open' or 'closed' voicing style
	 * @returns Array of {note, octave} objects, or empty array if invalid chord
	 */
	static getVoicedNotesFromSymbol(
		chordSymbol: string,
		inversion: 0 | 1 | 2 | 3,
		baseOctave: number,
		voicingMode: VoicingMode = 'open'
	): Array<{ note: string; octave: number }> {
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.notes.length) return [];
		return this.getVoicedNotes(chord.notes, inversion, baseOctave, voicingMode);
	}
}
