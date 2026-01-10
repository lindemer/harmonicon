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
	 * Get voiced chord notes with octave information.
	 *
	 * @param chordNotes - Array of note names from Chord.get().notes
	 * @param inversion - 0 (root), 1 (first), 2 (second), or 3 (third for 7th chords)
	 * @param baseOctave - Base octave for voicing (e.g., 3)
	 * @param voicingMode - 'spread' or 'close' voicing style
	 * @returns Array of {note, octave} objects
	 */
	static getVoicedNotes(
		chordNotes: string[],
		inversion: 0 | 1 | 2 | 3,
		baseOctave: number,
		voicingMode: VoicingMode = 'spread'
	): Array<{ note: string; octave: number }> {
		if (!chordNotes.length) return [];

		// Reorder notes based on inversion
		const invertedNotes = [...chordNotes.slice(inversion), ...chordNotes.slice(0, inversion)];

		const bassNote = invertedNotes[0];
		const bassChroma = Note.chroma(bassNote);

		if (bassChroma === undefined) {
			return invertedNotes.map((note) => ({ note, octave: baseOctave }));
		}

		if (voicingMode === 'close') {
			return this.getCloseVoicing(invertedNotes, baseOctave);
		}

		return this.getSpreadVoicing(invertedNotes, baseOctave);
	}

	/**
	 * Spread voicing: bass in lower octave, harmony in upper octave.
	 */
	private static getSpreadVoicing(
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
	 * Close voicing: all notes within the 2-octave range, bass placed closest to baseOctave's C.
	 * All notes must fit between C(baseOctave-1) and B(baseOctave).
	 */
	private static getCloseVoicing(
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
	 * @param voicingMode - 'spread' or 'close' voicing style
	 * @returns Array of {note, octave} objects, or empty array if invalid chord
	 */
	static getVoicedNotesFromSymbol(
		chordSymbol: string,
		inversion: 0 | 1 | 2 | 3,
		baseOctave: number,
		voicingMode: VoicingMode = 'spread'
	): Array<{ note: string; octave: number }> {
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.notes.length) return [];
		return this.getVoicedNotes(chord.notes, inversion, baseOctave, voicingMode);
	}
}
