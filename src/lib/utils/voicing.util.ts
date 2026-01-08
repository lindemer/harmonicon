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
	 * Voices chord so bass note is closest to the base octave's C (above or below).
	 * If any note would be 12+ semitones above baseOctave's C, the entire chord
	 * is shifted down one octave.
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

		// Place bass note closest to the base octave's C
		// If chroma > 6 (F# to B), place in octave below (closer to C going down)
		// If chroma <= 6 (C to F), place in base octave (closer to C going up)
		const bassOctave = bassChroma > 6 ? baseOctave - 1 : baseOctave;

		const voicedNotes = invertedNotes.map((noteName) => {
			const noteChroma = Note.chroma(noteName);
			if (noteChroma === undefined) return { note: noteName, octave: bassOctave };
			// Notes with chroma < bass go up an octave (voiced above bass)
			const octave = noteChroma < bassChroma ? bassOctave + 1 : bassOctave;
			return { note: noteName, octave };
		});

		// Check if any note is 12+ semitones above baseOctave's C
		// If so, shift the entire chord down one octave
		const maxSemitones = Math.max(
			...voicedNotes.map((n) => {
				const chroma = Note.chroma(n.note) ?? 0;
				return (n.octave - baseOctave) * 12 + chroma;
			})
		);

		if (maxSemitones >= 12) {
			return voicedNotes.map((n) => ({ ...n, octave: n.octave - 1 }));
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
