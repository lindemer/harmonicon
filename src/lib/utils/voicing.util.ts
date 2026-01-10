import type { Mode } from '$lib/types';
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
	 * Get voiced chord notes with octave information.
	 * Bass note is always placed between baseOctave-1's C and baseOctave's C.
	 * Harmony notes are placed as high as possible while staying below baseOctave+1's C.
	 *
	 * @param chordNotes - Array of note names from Chord.get().notes
	 * @param inversion - 0 (root), 1 (first), 2 (second), or 3 (third for 7th chords)
	 * @param baseOctave - Base octave for voicing (e.g., 3)
	 * @returns Array of {note, octave} objects
	 */
	static getVoicedNotes(
		chordNotes: string[],
		inversion: 0 | 1 | 2 | 3,
		baseOctave: number
	): Array<{ note: string; octave: number }> {
		if (!chordNotes.length) return [];

		// Reorder notes based on inversion
		const invertedNotes = [...chordNotes.slice(inversion), ...chordNotes.slice(0, inversion)];

		const bassNote = invertedNotes[0];
		const bassChroma = Note.chroma(bassNote);

		if (bassChroma === undefined) {
			return invertedNotes.map((note) => ({ note, octave: baseOctave }));
		}

		// Bass note always in the octave below baseOctave (between C(baseOctave-1) and C(baseOctave))
		const bassOctave = baseOctave - 1;

		// Build voiced notes: bass goes low, harmony notes go as high as possible below baseOctave+1's C
		const voicedNotes = invertedNotes.map((noteName, index) => {
			const noteChroma = Note.chroma(noteName);
			if (noteChroma === undefined) return { note: noteName, octave: bassOctave };

			if (index === 0) {
				// Bass note always in lower octave
				return { note: noteName, octave: bassOctave };
			}

			// Harmony notes: place at baseOctave (high)
			// All notes have chroma 0-11, so placing at baseOctave means they'll be between
			// C(baseOctave) and B(baseOctave), which is below C(baseOctave+1)
			return { note: noteName, octave: baseOctave };
		});

		return voicedNotes;
	}

	/**
	 * Get voiced notes from a chord symbol.
	 * Convenience method that parses the chord symbol first.
	 *
	 * @param chordSymbol - Chord symbol (e.g., 'C', 'Am', 'Bdim', 'Cmaj7')
	 * @param inversion - 0 (root), 1 (first), 2 (second), or 3 (third for 7th chords)
	 * @param baseOctave - Base octave for voicing
	 * @returns Array of {note, octave} objects, or empty array if invalid chord
	 */
	static getVoicedNotesFromSymbol(
		chordSymbol: string,
		inversion: 0 | 1 | 2 | 3,
		baseOctave: number
	): Array<{ note: string; octave: number }> {
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.notes.length) return [];
		return this.getVoicedNotes(chord.notes, inversion, baseOctave);
	}
}
