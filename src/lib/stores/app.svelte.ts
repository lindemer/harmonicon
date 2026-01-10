import { Chord } from 'tonal';
import { SvelteSet } from 'svelte/reactivity';
import { FormatUtil } from '$lib/utils/format.util';
import { audioState } from './audio.svelte';
import type { Mode, VoicingMode, PlayMode } from '$lib/types';

// ============ AppState Interface ============

export interface DetectedChord {
	symbol: string; // Full chord symbol (e.g., "Am7")
	bass: string | null; // Bass note if inverted (e.g., "E")
	inversion: 0 | 1 | 2 | 3;
}

export interface AppState {
	// Key/Mode selection
	selectedRoot: string;
	mode: Mode;
	toggleMode(): void;

	// Chord detection (derived from pressed notes)
	detectedChord: DetectedChord | null;

	// Chord mode (for keyboard visual feedback)
	isSeventhMode: boolean;
	isNinthMode: boolean;

	// Octave control
	pianoStartOctave: number;
	chordDisplayOctave: number;
	incrementChordOctave(): void;
	decrementChordOctave(): void;

	// Voicing mode
	voicingMode: VoicingMode;
	setVoicingMode(mode: VoicingMode): void;
	toggleVoicingMode(): void;

	// Play mode (notes vs chords for letter keys)
	playMode: PlayMode;
	togglePlayMode(): void;

	// Pressed state (visual + audio)
	pressedDegree: number | null;
	pressedNotes: SvelteSet<string>;
	addPressedNote(note: string, octave: number): void;
	removePressedNote(note: string, octave: number): void;
	addPressedNotes(notes: Array<{ note: string; octave: number }>): void;
	removePressedNotes(notes: Array<{ note: string; octave: number }>): void;
	clearPressedNotes(): void;

	// Audio mute
	isMuted: boolean;
	setMuted(value: boolean): void;
	toggleMuted(): void;

	// Derived
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }>;
}

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');
let isSeventhMode = $state(false);
let isNinthMode = $state(false);
let pianoStartOctave = $state(2);
let chordDisplayOctave = $state(3); // Default octave for chord display (C3)
let voicingMode = $state<VoicingMode>('open');
let playMode = $state<PlayMode>('notes');
let pressedDegree = $state<number | null>(null);

// Track all currently pressed notes as "{note}{octave}" strings (e.g., "C4", "F#3")
const pressedNotes = new SvelteSet<string>();

/**
 * Select the preferred chord interpretation from Chord.detect() results.
 * Prefers simpler chord types (major/minor) over complex ones (augmented/altered).
 * For inversions, prefers slash chords of simple types over root-position complex chords.
 */
function selectPreferredChord(detected: string[]): string {
	if (detected.length === 1) return detected[0];

	// Score each chord - lower is better
	const scoreChord = (chord: string): number => {
		const isSlash = chord.includes('/');
		const baseChord = isSlash ? chord.substring(0, chord.indexOf('/')) : chord;

		// Extract quality from chord symbol (after the root note)
		const qualityMatch = baseChord.match(/^[A-G][#b]?(.*)/);
		const quality = qualityMatch ? qualityMatch[1] : '';

		// Prefer these common chord types (lower score = more preferred)
		if (quality === 'M' || quality === '' || quality === 'maj') return isSlash ? 1 : 0; // Major triad
		if (quality === 'm') return isSlash ? 1 : 0; // Minor triad
		if (quality === 'dim' || quality === 'o' || quality === '°') return isSlash ? 2 : 1; // Diminished
		if (quality === 'maj7' || quality === 'M7') return isSlash ? 2 : 1; // Major 7
		if (quality === 'm7') return isSlash ? 2 : 1; // Minor 7
		if (quality === '7') return isSlash ? 2 : 1; // Dominant 7
		if (quality === 'dim7' || quality === 'o7') return isSlash ? 3 : 2; // Diminished 7
		if (quality === 'm7b5' || quality === 'ø' || quality === 'ø7') return isSlash ? 3 : 2; // Half-dim
		if (quality.includes('9')) return isSlash ? 3 : 2; // 9th chords

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

export const appState = {
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

	// Detect chord from currently pressed notes within a two-octave range
	// Range: from (chordDisplayOctave - 1) up to (but not including) chordDisplayOctave + 1
	// e.g., if chordDisplayOctave is 3, range is C2 to B3 (octaves 2 and 3)
	get detectedChord(): DetectedChord | null {
		const octave = chordDisplayOctave;
		const notesInRange: string[] = [];

		for (const noteStr of pressedNotes) {
			const match = noteStr.match(/^([A-G][#b]?)(\d+)$/);
			if (match) {
				const noteOctave = parseInt(match[2]);
				// Include notes in the octave below and the octave of the root C
				if (noteOctave === octave || noteOctave === octave - 1) {
					notesInRange.push(match[1]); // Just the pitch class
				}
			}
		}

		if (notesInRange.length < 2) return null; // Need at least 2 notes for a chord

		// Count unique pitch classes (ignore octave duplicates)
		const uniquePitchClasses = new Set(notesInRange).size;

		// If too many unique notes are pressed (more than a 9th chord = 5 notes),
		// the detection is likely to be unreliable
		if (uniquePitchClasses > 5) return null;

		const detected = Chord.detect(notesInRange);
		if (detected.length === 0) return null;

		// Chord.detect() returns multiple interpretations. For inversions, it often returns
		// an obscure chord first (e.g., "Bbm#5") and the slash chord second (e.g., "GbM/Bb").
		// Prefer simpler chord types: major/minor triads and 7ths over augmented/diminished variants.
		const preferredChord = selectPreferredChord(detected);

		// Parse slash chord for inversions (e.g., "Am7/E")
		const slashIndex = preferredChord.indexOf('/');
		if (slashIndex === -1) {
			return {
				symbol: FormatUtil.formatNote(preferredChord),
				bass: null,
				inversion: 0
			};
		}

		const symbol = preferredChord.substring(0, slashIndex);
		const bass = preferredChord.substring(slashIndex + 1);

		// Determine inversion by finding bass note position in chord
		const chord = Chord.get(symbol);
		if (chord.empty) {
			return {
				symbol: FormatUtil.formatNote(symbol),
				bass: FormatUtil.formatNote(bass),
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
			symbol: FormatUtil.formatNote(symbol),
			bass: FormatUtil.formatNote(bass),
			inversion
		};
	},

	get isSeventhMode() {
		return isSeventhMode;
	},

	set isSeventhMode(value: boolean) {
		isSeventhMode = value;
	},

	get isNinthMode() {
		return isNinthMode;
	},

	set isNinthMode(value: boolean) {
		isNinthMode = value;
	},

	get pianoStartOctave() {
		return pianoStartOctave;
	},

	set pianoStartOctave(value: number) {
		pianoStartOctave = value;
	},

	get chordDisplayOctave() {
		return chordDisplayOctave;
	},

	incrementChordOctave() {
		if (chordDisplayOctave < 5) chordDisplayOctave++;
	},

	decrementChordOctave() {
		if (chordDisplayOctave > 3) chordDisplayOctave--;
	},

	get voicingMode() {
		return voicingMode;
	},

	setVoicingMode(mode: VoicingMode) {
		voicingMode = mode;
	},

	toggleVoicingMode() {
		voicingMode = voicingMode === 'open' ? 'closed' : 'open';
	},

	get playMode() {
		return playMode;
	},

	togglePlayMode() {
		playMode = playMode === 'notes' ? 'chords' : 'notes';
	},

	// Pressed key state for visual feedback
	get pressedDegree() {
		return pressedDegree;
	},

	set pressedDegree(value: number | null) {
		pressedDegree = value;
	},

	get pressedNotes() {
		return pressedNotes;
	},

	// Add a note to the pressed set and play audio
	addPressedNote(note: string, octave: number) {
		pressedNotes.add(`${note}${octave}`);
		audioState.playNote(note, octave);
	},

	// Remove a note from the pressed set and stop audio
	removePressedNote(note: string, octave: number) {
		pressedNotes.delete(`${note}${octave}`);
		audioState.stopNote(note, octave);
	},

	// Add multiple notes at once (for chords) and play audio
	addPressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.add(`${n.note}${n.octave}`);
		}
		audioState.playNotes(notes);
	},

	// Remove multiple notes at once (for chords) and stop audio
	removePressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.delete(`${n.note}${n.octave}`);
		}
		audioState.stopNotes(notes);
	},

	// Clear all pressed notes and stop all audio
	clearPressedNotes() {
		pressedNotes.clear();
		audioState.stopAllNotes();
	},

	// Audio mute controls
	get isMuted() {
		return audioState.muted;
	},

	setMuted(value: boolean) {
		if (value) {
			this.clearPressedNotes();
		}
		audioState.muted = value;
	},

	toggleMuted() {
		this.setMuted(!audioState.muted);
	},

	// Get the notes that should be highlighted on the piano based on pressed notes
	// Returns array of {note, octave} objects
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }> {
		const results: Array<{ note: string; octave: number }> = [];

		// All notes are now in pressedNotes set (individual notes, chords, etc.)
		for (const noteStr of pressedNotes) {
			// Parse "C4" -> { note: "C", octave: 4 } or "F#3" -> { note: "F#", octave: 3 } or "Eb3" -> { note: "Eb", octave: 3 }
			const match = noteStr.match(/^([A-G][#b]?)(\d+)$/);
			if (match) {
				results.push({ note: match[1], octave: parseInt(match[2]) });
			}
		}

		return results;
	}
};
