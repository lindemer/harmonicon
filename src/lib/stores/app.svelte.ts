import { Chord } from 'tonal';
import { SvelteSet } from 'svelte/reactivity';
import * as Tone from 'tone';
import { FormatUtil, type Mode } from '$lib/utils/format.util';
import { VoicingUtil } from '$lib/utils/voicing.util';

// Re-export types
export type { Mode };

// ============ Audio State (private) ============
let sampler: Tone.Sampler | null = null;
const playingNotes = new Set<string>();
let muted = $state(true);

// ============ Audio Helper Functions (private) ============

/** Convert note name and octave to Tone.js format (e.g., "C#", 4 -> "C#4") */
function formatNoteForTone(note: string, octave: number): string {
	const normalized = note.replace('♯', '#').replace('♭', 'b');
	return `${normalized}${octave}`;
}

/** Initialize the audio context and sampler. Must be called from a user gesture. */
async function ensureAudioReady(): Promise<void> {
	if (Tone.getContext().state !== 'running') {
		await Tone.start();
	}

	if (!sampler) {
		await new Promise<void>((resolve) => {
			sampler = new Tone.Sampler({
				urls: {
					A0: 'A0.mp3',
					C1: 'C1.mp3',
					'D#1': 'Ds1.mp3',
					'F#1': 'Fs1.mp3',
					A1: 'A1.mp3',
					C2: 'C2.mp3',
					'D#2': 'Ds2.mp3',
					'F#2': 'Fs2.mp3',
					A2: 'A2.mp3',
					C3: 'C3.mp3',
					'D#3': 'Ds3.mp3',
					'F#3': 'Fs3.mp3',
					A3: 'A3.mp3',
					C4: 'C4.mp3',
					'D#4': 'Ds4.mp3',
					'F#4': 'Fs4.mp3',
					A4: 'A4.mp3',
					C5: 'C5.mp3',
					'D#5': 'Ds5.mp3',
					'F#5': 'Fs5.mp3',
					A5: 'A5.mp3',
					C6: 'C6.mp3',
					'D#6': 'Ds6.mp3',
					'F#6': 'Fs6.mp3',
					A6: 'A6.mp3',
					C7: 'C7.mp3',
					'D#7': 'Ds7.mp3',
					'F#7': 'Fs7.mp3',
					A7: 'A7.mp3',
					C8: 'C8.mp3'
				},
				release: 1,
				baseUrl: 'https://tonejs.github.io/audio/salamander/',
				onload: () => {
					resolve();
				}
			}).toDestination();

			sampler.volume.value = -6;
		});
	}
}

/** Play a single note (internal - called by addPressedNote) */
async function playNoteAudio(note: string, octave: number): Promise<void> {
	if (muted) return;
	await ensureAudioReady();
	if (!sampler) return;

	const noteStr = formatNoteForTone(note, octave);
	if (playingNotes.has(noteStr)) return;

	playingNotes.add(noteStr);
	sampler.triggerAttack(noteStr, Tone.now());
}

/** Stop a single note (internal - called by removePressedNote) */
function stopNoteAudio(note: string, octave: number): void {
	if (!sampler) return;

	const noteStr = formatNoteForTone(note, octave);
	if (playingNotes.has(noteStr)) {
		playingNotes.delete(noteStr);
		sampler.triggerRelease(noteStr, Tone.now());
	}
}

/** Play multiple notes (internal - called by addPressedNotes) */
async function playNotesAudio(notes: Array<{ note: string; octave: number }>): Promise<void> {
	if (muted) return;
	await ensureAudioReady();
	if (!sampler) return;

	const noteStrings = notes.map((n) => formatNoteForTone(n.note, n.octave));
	const newNotes = noteStrings.filter((n) => !playingNotes.has(n));

	if (newNotes.length > 0) {
		newNotes.forEach((n) => playingNotes.add(n));
		sampler.triggerAttack(newNotes, Tone.now());
	}
}

/** Stop multiple notes (internal - called by removePressedNotes) */
function stopNotesAudio(notes: Array<{ note: string; octave: number }>): void {
	if (!sampler) return;

	const noteStrings = notes.map((n) => formatNoteForTone(n.note, n.octave));
	const notesToStop = noteStrings.filter((n) => playingNotes.has(n));

	if (notesToStop.length > 0) {
		notesToStop.forEach((n) => playingNotes.delete(n));
		sampler.triggerRelease(notesToStop, Tone.now());
	}
}

/** Stop all currently playing notes (internal - called by clearPressedNotes) */
function stopAllNotesAudio(): void {
	if (!sampler) return;

	if (playingNotes.size > 0) {
		sampler.triggerRelease(Array.from(playingNotes), Tone.now());
		playingNotes.clear();
	}
}

// The selected key root note (e.g., 'C', 'G', 'F#')
let selectedRoot = $state('C');
let mode = $state<Mode>('major');
let selectedChord = $state<string | null>(null);
let selectedInversion = $state<0 | 1 | 2>(0);
let pianoStartOctave = $state(2);
let chordDisplayOctave = $state(3); // Default octave for chord display (C3)
let pressedDegree = $state<number | null>(null);
let isChordPressed = $state(false);

// Track all currently pressed notes as "{note}{octave}" strings (e.g., "C4", "F#3")
const pressedNotes = new SvelteSet<string>();

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

	get selectedChord() {
		return selectedChord;
	},

	set selectedChord(value: string | null) {
		selectedChord = value;
		selectedInversion = 0; // Reset inversion when chord changes
	},

	get selectedInversion() {
		return selectedInversion;
	},

	set selectedInversion(value: 0 | 1 | 2) {
		selectedInversion = value;
	},

	/**
	 * Select a chord with optional inversion and toggle behavior.
	 * Consolidates chord selection logic used across components.
	 * @param chord - Chord symbol to select, or null to deselect
	 * @param inversion - Inversion level (0, 1, or 2)
	 * @param toggle - If true, deselects if the same chord/inversion is already selected
	 */
	selectChord(chord: string | null, inversion: 0 | 1 | 2 = 0, toggle = false) {
		if (toggle && selectedChord === chord && selectedInversion === inversion) {
			selectedChord = null;
			selectedInversion = 0;
		} else {
			selectedChord = chord;
			selectedInversion = inversion;
		}
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
		playNoteAudio(note, octave);
	},

	// Remove a note from the pressed set and stop audio
	removePressedNote(note: string, octave: number) {
		pressedNotes.delete(`${note}${octave}`);
		stopNoteAudio(note, octave);
	},

	// Add multiple notes at once (for chords) and play audio
	addPressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.add(`${n.note}${n.octave}`);
		}
		playNotesAudio(notes);
	},

	// Remove multiple notes at once (for chords) and stop audio
	removePressedNotes(notes: Array<{ note: string; octave: number }>) {
		for (const n of notes) {
			pressedNotes.delete(`${n.note}${n.octave}`);
		}
		stopNotesAudio(notes);
	},

	// Clear all pressed notes and stop all audio
	clearPressedNotes() {
		pressedNotes.clear();
		stopAllNotesAudio();
	},

	get isChordPressed() {
		return isChordPressed;
	},

	set isChordPressed(value: boolean) {
		isChordPressed = value;
	},

	// Audio mute controls
	get isMuted() {
		return muted;
	},

	setMuted(value: boolean) {
		if (value) {
			this.clearPressedNotes();
		}
		muted = value;
	},

	toggleMuted() {
		this.setMuted(!muted);
	},

	// Get the notes that should be highlighted on the piano based on pressed keys
	// Returns array of {note, octave} objects
	getHighlightedPianoNotes(): Array<{ note: string; octave: number }> {
		const results: Array<{ note: string; octave: number }> = [];

		// Chord highlighting from degree key (1-7)
		if (pressedDegree !== null) {
			const chord = VoicingUtil.getChordForDegree(pressedDegree, selectedRoot, mode);
			if (chord && chord.notes.length) {
				results.push(
					...VoicingUtil.getVoicedNotes(chord.notes, selectedInversion, chordDisplayOctave)
				);
			}
		}

		// Chord highlighting from Circle of Fifths mouse interaction
		if (isChordPressed && selectedChord) {
			const chordSymbol = FormatUtil.unformatNote(selectedChord);
			const chord = Chord.get(chordSymbol);
			if (!chord.empty && chord.notes.length) {
				results.push(
					...VoicingUtil.getVoicedNotes(chord.notes, selectedInversion, chordDisplayOctave)
				);
			}
		}

		// Notes from pressedNotes set (keyboard keys, chords, etc.)
		for (const noteStr of pressedNotes) {
			// Parse "C4" -> { note: "C", octave: 4 } or "F#3" -> { note: "F#", octave: 3 }
			const match = noteStr.match(/^([A-G]#?)(\d+)$/);
			if (match) {
				results.push({ note: match[1], octave: parseInt(match[2]) });
			}
		}

		return results;
	}
};
