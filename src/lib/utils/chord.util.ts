import { Chord, Note } from 'tonal';
import type { VoicingMode } from '$lib/types';
import { VoicingUtil } from './voicing.util';
import { FormatUtil } from './format.util';

/**
 * Utility class for chord building, detection, and symbol generation.
 * Pure static functions with no state dependencies.
 *
 * ## Chord Detection Architecture
 *
 * The app detects chords from pressed notes (via MIDI, keyboard, or circle clicks):
 *
 * 1. **Input** → Notes are added to `appState.pressedNotes` as "{note}{octave}" strings
 * 2. **Detection** → `ChordUtil.detectChord()` uses Tonal's `Chord.detect()` to identify the chord
 * 3. **Selection** → `selectPreferredChord()` picks the best interpretation when multiple exist
 * 4. **Display** → `appState.detectedChord` is used by UI components to show the chord
 *
 * The detection must handle ambiguous cases where Tonal returns multiple interpretations:
 * - Inversions: "C/E" vs "Em#5" - we prefer simple slash chords
 * - Extensions: "Cmaj7" vs "Cmaj9" - when 5 notes are pressed, prefer 9th chords
 * - Alterations: Prefer common chord types over augmented/altered variants
 */
export class ChordUtil {
	// ============ Chord Building ============

	/**
	 * Build a chord symbol from a root note and modifiers.
	 * @param note - Root note (e.g., 'C', 'F#')
	 * @param isMinor - Use minor chord quality
	 * @param isSeventh - Add 7th extension
	 * @param isNinth - Add 9th extension (implies 7th)
	 * @param useModern7th - If true, always use flat 7 (dominant); if false, use diatonic (maj7 for major)
	 * @returns Chord symbol like 'C', 'Cm', 'Cmaj7', 'Cm7', 'C7', 'C9', 'Cm9'
	 */
	static buildChordSymbol(
		note: string,
		isMinor: boolean,
		isSeventh: boolean,
		isNinth: boolean,
		useModern7th: boolean = false
	): string {
		let chordSymbol = note + (isMinor ? 'm' : '');
		if (isNinth) {
			// In modern mode, C9 means dominant 9; in classic mode, Cmaj9 for major chords
			if (useModern7th || isMinor) {
				chordSymbol += '9';
			} else {
				chordSymbol += 'maj9';
			}
		} else if (isSeventh) {
			// In modern mode, C7 means dominant 7; in classic mode, Cmaj7 for major chords
			if (useModern7th || isMinor) {
				chordSymbol += '7';
			} else {
				chordSymbol += 'maj7';
			}
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
	 * @param useModern7th - If true, always use flat 7 (dominant); if false, use diatonic
	 * @returns Array of {note, octave} objects with simplified enharmonic spellings
	 */
	static getChordNotes(
		note: string,
		isMinor: boolean,
		inversion: 0 | 1 | 2 | 3,
		isSeventh: boolean,
		isNinth: boolean,
		baseOctave: number,
		voicingMode: VoicingMode,
		useModern7th: boolean = false
	): Array<{ note: string; octave: number }> {
		const chordSymbol = this.buildChordSymbol(note, isMinor, isSeventh, isNinth, useModern7th);

		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.notes.length) return [];

		const voicedNotes = VoicingUtil.getVoicedNotes(chord.notes, inversion, baseOctave, voicingMode);

		// Normalize any double sharps/flats to simpler enharmonics (e.g., F## -> G)
		return voicedNotes.map((vn) => ({
			note: Note.simplify(vn.note) || vn.note,
			octave: vn.octave
		}));
	}

	// ============ Chord Detection ============

	/** Detected chord information from pressed notes */
	static readonly DetectedChord: unique symbol = Symbol('DetectedChord');

	/**
	 * Convert a note name and octave to an absolute pitch value for sorting.
	 * Higher values = higher pitch. Used to ensure correct bass note detection.
	 */
	private static getAbsolutePitch(note: string, octave: number): number {
		const chromaticMap: Record<string, number> = {
			C: 0,
			'C#': 1,
			Db: 1,
			D: 2,
			'D#': 3,
			Eb: 3,
			E: 4,
			Fb: 4,
			F: 5,
			'E#': 5,
			'F#': 6,
			Gb: 6,
			G: 7,
			'G#': 8,
			Ab: 8,
			A: 9,
			'A#': 10,
			Bb: 10,
			B: 11,
			Cb: 11
		};
		return octave * 12 + (chromaticMap[note] ?? 0);
	}

	/**
	 * Select the preferred chord interpretation from Chord.detect() results.
	 * Prefers simpler chord types (major/minor) over complex ones (augmented/altered).
	 * For inversions, prefers slash chords of simple types over root-position complex chords.
	 * When 5 unique notes are pressed, prefer 9th chords over 7th chords.
	 */
	private static selectPreferredChord(detected: string[], uniqueNoteCount: number): string {
		if (detected.length === 1) return detected[0];

		// Score each chord - lower is better
		const scoreChord = (chord: string): number => {
			const isSlash = chord.includes('/');
			const baseChord = isSlash ? chord.substring(0, chord.indexOf('/')) : chord;

			// Extract quality from chord symbol (after the root note)
			const qualityMatch = baseChord.match(/^[A-G][#b]?(.*)/);
			const quality = qualityMatch ? qualityMatch[1] : '';

			// When 5 notes are pressed, prefer 9th chords over 7th chords
			const has9th = quality.includes('9');
			const ninthBonus = uniqueNoteCount === 5 && has9th ? -2 : 0;

			// Prefer these common chord types (lower score = more preferred)
			if (quality === 'M' || quality === '' || quality === 'maj') return isSlash ? 1 : 0; // Major triad
			if (quality === 'm') return isSlash ? 1 : 0; // Minor triad
			if (quality === 'dim' || quality === 'o' || quality === '°') return isSlash ? 2 : 1; // Diminished
			if (quality === 'maj7' || quality === 'M7') return isSlash ? 2 : 1; // Major 7
			if (quality === 'm7') return isSlash ? 2 : 1; // Minor 7
			if (quality === '7') return isSlash ? 2 : 1; // Dominant 7
			if (quality === 'dim7' || quality === 'o7') return isSlash ? 3 : 2; // Diminished 7
			if (quality === 'm7b5' || quality === 'ø' || quality === 'ø7') return isSlash ? 3 : 2; // Half-dim
			if (has9th) return (isSlash ? 3 : 2) + ninthBonus; // 9th chords

			// Penalize augmented and altered chords heavily
			if (quality.includes('#5') || quality.includes('+') || quality === 'aug') return 10;
			if (quality.includes('b5') && !quality.includes('m7b5')) return 10;

			return 5; // Default for other chord types
		};

		// Find the chord with the lowest score
		let bestChord = detected[0];
		let bestScore = scoreChord(detected[0]);

		for (let i = 1; i < detected.length; i++) {
			const score = scoreChord(detected[i]);
			if (score < bestScore) {
				bestScore = score;
				bestChord = detected[i];
			}
		}

		return bestChord;
	}

	/**
	 * Convert a chord symbol's root note to flat notation.
	 * E.g., "C#m7" → "Dbm7", "G#/B" → "Ab/B"
	 */
	private static convertChordToFlatNotation(chordSymbol: string): string {
		const match = chordSymbol.match(/^([A-G][#b]?)(.*)$/);
		if (!match) return chordSymbol;
		const [, root, suffix] = match;
		return FormatUtil.toFlatNotation(root) + suffix;
	}

	/**
	 * Detect chord from a set of pressed notes.
	 * Notes are expected to be in the format "{note}{octave}" (e.g., "C4", "F#3").
	 *
	 * @param pressedNotes - Set of note strings in "{note}{octave}" format
	 * @param keyRoot - Optional key root to determine sharp/flat preference
	 * @returns DetectedChord object or null if no valid chord detected
	 */
	static detectChord(pressedNotes: Set<string>, keyRoot?: string): DetectedChord | null {
		const notesWithPitch: Array<{ note: string; pitch: number }> = [];

		for (const noteStr of pressedNotes) {
			const match = noteStr.match(/^([A-G][#b]?)(\d+)$/);
			if (match) {
				const noteName = match[1];
				const noteOctave = parseInt(match[2]);
				notesWithPitch.push({
					note: noteName,
					pitch: this.getAbsolutePitch(noteName, noteOctave)
				});
			}
		}

		if (notesWithPitch.length < 3) return null; // Need at least 3 notes for a chord

		// Sort by actual pitch (lowest first) for correct bass note / inversion detection
		notesWithPitch.sort((a, b) => a.pitch - b.pitch);

		// Extract pitch classes in sorted order
		const notesInRange = notesWithPitch.map((n) => n.note);

		// Count unique pitch classes (ignore octave duplicates)
		const uniquePitchClasses = new Set(notesInRange).size;

		// Need at least 3 unique pitch classes for chord detection
		if (uniquePitchClasses < 3) return null;

		// If too many unique notes are pressed (more than a 9th chord = 5 notes),
		// the detection is likely to be unreliable
		if (uniquePitchClasses > 5) return null;

		const detected = Chord.detect(notesInRange);
		if (detected.length === 0) return null;

		// Chord.detect() returns multiple interpretations. For inversions, it often returns
		// an obscure chord first (e.g., "Bbm#5") and the slash chord second (e.g., "GbM/Bb").
		// Prefer simpler chord types: major/minor triads and 7ths over augmented/diminished variants.
		// Pass uniquePitchClasses to prefer 9th chords when 5 notes are pressed.
		const preferredChord = this.selectPreferredChord(detected, uniquePitchClasses);

		// Convert to flat notation if the key uses flats (e.g., C# → Db in Db major)
		const useFlatNotation = keyRoot && FormatUtil.usesFlatNotation(keyRoot);

		// Parse slash chord for inversions (e.g., "Am7/E")
		const slashIndex = preferredChord.indexOf('/');
		if (slashIndex === -1) {
			const formattedChord = useFlatNotation
				? this.convertChordToFlatNotation(preferredChord)
				: preferredChord;
			return {
				symbol: FormatUtil.formatNote(formattedChord),
				bass: null,
				inversion: 0
			};
		}

		const symbol = preferredChord.substring(0, slashIndex);
		const bass = preferredChord.substring(slashIndex + 1);

		// Apply flat notation conversion to both symbol and bass note
		const formattedSymbol = useFlatNotation ? this.convertChordToFlatNotation(symbol) : symbol;
		const formattedBass = useFlatNotation ? FormatUtil.toFlatNotation(bass) : bass;

		// Determine inversion by finding bass note position in chord
		const chord = Chord.get(symbol);
		if (chord.empty) {
			return {
				symbol: FormatUtil.formatNote(formattedSymbol),
				bass: FormatUtil.formatNote(formattedBass),
				inversion: 0
			};
		}

		const bassIndex = chord.notes.findIndex(
			(n) =>
				n.toUpperCase() === bass.toUpperCase() ||
				FormatUtil.formatNote(n) === FormatUtil.formatNote(bass)
		);
		const inversion = (bassIndex >= 0 && bassIndex <= 3 ? bassIndex : 0) as 0 | 1 | 2 | 3;

		return {
			symbol: FormatUtil.formatNote(formattedSymbol),
			bass: FormatUtil.formatNote(formattedBass),
			inversion
		};
	}
}

/** Detected chord information from pressed notes */
export interface DetectedChord {
	symbol: string; // Full chord symbol (e.g., "Am7")
	bass: string | null; // Bass note if inverted (e.g., "E")
	inversion: 0 | 1 | 2 | 3;
}
