import { Chord, Note } from 'tonal';
import type { VoicingMode } from '$lib/types';
import { VoicingUtil } from './voicing.util';

/**
 * Utility class for chord building and symbol generation.
 * Pure static functions with no state dependencies.
 */
export class ChordUtil {
	/**
	 * Build a chord symbol from a root note and modifiers.
	 * @param note - Root note (e.g., 'C', 'F#')
	 * @param isMinor - Use minor chord quality
	 * @param isSeventh - Add 7th extension
	 * @param isNinth - Add 9th extension (implies 7th)
	 * @returns Chord symbol like 'C', 'Cm', 'Cmaj7', 'Cm7', 'C9', 'Cm9'
	 */
	static buildChordSymbol(
		note: string,
		isMinor: boolean,
		isSeventh: boolean,
		isNinth: boolean
	): string {
		let chordSymbol = note + (isMinor ? 'm' : '');
		if (isNinth) {
			chordSymbol += '9';
		} else if (isSeventh) {
			chordSymbol += isMinor ? '7' : 'maj7';
		}
		return chordSymbol;
	}

	/**
	 * Get voiced chord notes for a given root note with modifiers.
	 * @param note - Root note (e.g., 'C', 'F#')
	 * @param isMinor - Use minor chord quality
	 * @param inversion - Inversion (0=root, 1=first, 2=second, 3=third)
	 * @param isSeventh - Add 7th extension
	 * @param isNinth - Add 9th extension
	 * @param baseOctave - Base octave for voicing
	 * @param voicingMode - 'open' or 'closed' voicing style
	 * @returns Array of {note, octave} objects with simplified enharmonic spellings
	 */
	static getChordNotes(
		note: string,
		isMinor: boolean,
		inversion: 0 | 1 | 2 | 3,
		isSeventh: boolean,
		isNinth: boolean,
		baseOctave: number,
		voicingMode: VoicingMode
	): Array<{ note: string; octave: number }> {
		const chordSymbol = this.buildChordSymbol(note, isMinor, isSeventh, isNinth);

		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.notes.length) return [];

		const voicedNotes = VoicingUtil.getVoicedNotes(chord.notes, inversion, baseOctave, voicingMode);

		// Normalize any double sharps/flats to simpler enharmonics (e.g., F## -> G)
		return voicedNotes.map((vn) => ({
			note: Note.simplify(vn.note) || vn.note,
			octave: vn.octave
		}));
	}
}
