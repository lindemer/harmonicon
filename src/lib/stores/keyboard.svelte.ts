import { Key } from 'tonal';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { appState } from '$lib/stores/app.svelte';
import { FormatUtil } from '$lib/utils/format.util';
import { VoicingUtil } from '$lib/utils/voicing.util';
import { AudioService } from '$lib/services/audio.service';

// ============ Constants ============

/** Piano keys that trigger note playback */
const pianoKeyChars = new Set([
	'a',
	's',
	'd',
	'f',
	'g',
	'h',
	'j',
	'k',
	'l',
	';',
	'w',
	'e',
	't',
	'y',
	'u',
	'o',
	'p'
]);

/** Keyboard key to note mapping (for audio playback) */
const KEY_TO_NOTE: Record<string, { note: string; octaveOffset: number }> = {
	// White keys (home row)
	a: { note: 'C', octaveOffset: 0 },
	s: { note: 'D', octaveOffset: 0 },
	d: { note: 'E', octaveOffset: 0 },
	f: { note: 'F', octaveOffset: 0 },
	g: { note: 'G', octaveOffset: 0 },
	h: { note: 'A', octaveOffset: 0 },
	j: { note: 'B', octaveOffset: 0 },
	k: { note: 'C', octaveOffset: 1 },
	l: { note: 'D', octaveOffset: 1 },
	';': { note: 'E', octaveOffset: 1 },
	// Black keys (top row)
	w: { note: 'C#', octaveOffset: 0 },
	e: { note: 'D#', octaveOffset: 0 },
	t: { note: 'F#', octaveOffset: 0 },
	y: { note: 'G#', octaveOffset: 0 },
	u: { note: 'A#', octaveOffset: 0 },
	o: { note: 'C#', octaveOffset: 1 },
	p: { note: 'D#', octaveOffset: 1 }
};

/** Map KeyboardEvent.code to key characters (handles Alt+key on macOS) */
const codeToKey: Record<string, string> = {
	KeyA: 'a',
	KeyS: 's',
	KeyD: 'd',
	KeyF: 'f',
	KeyG: 'g',
	KeyH: 'h',
	KeyJ: 'j',
	KeyK: 'k',
	KeyL: 'l',
	Semicolon: ';',
	KeyW: 'w',
	KeyE: 'e',
	KeyT: 't',
	KeyY: 'y',
	KeyU: 'u',
	KeyO: 'o',
	KeyP: 'p',
	Digit1: '1',
	Digit2: '2',
	Digit3: '3',
	Digit4: '4',
	Digit5: '5',
	Digit6: '6',
	Digit7: '7',
	KeyZ: 'z',
	KeyX: 'x'
};

// ============ State ============

// Modifier states
let shiftPressed = $state(false);
let altPressed = $state(false);
let spacePressed = $state(false);

// Visual feedback state
const pressedKeys = new SvelteSet<string>();
let clickedActionKey = $state<string | null>(null);
let spaceClicked = $state(false);

// Drag states
let isDraggingDegree = $state(false);
let isDraggingNote = $state(false);

// Audio tracking (internal)
const playingDegreeNotes = new SvelteMap<number, Array<{ note: string; octave: number }>>();
const pressedPianoKeys = new SvelteSet<string>();
let currentChordNotes: Array<{ note: string; octave: number }> = [];
let currentNoteInfo: { note: string; octave: number } | null = null;

// ============ Helper Functions ============

/** Get note info for audio playback */
function getNoteForKey(key: string): { note: string; octave: number } | null {
	const keyInfo = KEY_TO_NOTE[key.toLowerCase()];
	if (!keyInfo) return null;
	const octave = appState.chordDisplayOctave + 1 + keyInfo.octaveOffset;
	return { note: keyInfo.note, octave };
}

/** Get chord notes for a scale degree */
function getChordNotesForDegree(
	degree: number,
	inversion: 0 | 1 | 2
): Array<{ note: string; octave: number }> {
	const chord = VoicingUtil.getChordForDegree(degree, appState.selectedRoot, appState.mode);
	if (!chord || !chord.notes.length) return [];
	return VoicingUtil.getVoicedNotes(chord.notes, inversion, appState.chordDisplayOctave);
}

// ============ Exported State ============

export const keyboardState = {
	// Layout constants
	numberRow: ['1', '2', '3', '4', '5', '6', '7'],

	pianoKeys: [
		{ white: 'A', black: null, note: 'C', blackNote: null },
		{ white: 'S', black: 'W', note: 'D', blackNote: 'C#' },
		{ white: 'D', black: 'E', note: 'E', blackNote: 'D#' },
		{ white: 'F', black: null, note: 'F', blackNote: null },
		{ white: 'G', black: 'T', note: 'G', blackNote: 'F#' },
		{ white: 'H', black: 'Y', note: 'A', blackNote: 'G#' },
		{ white: 'J', black: 'U', note: 'B', blackNote: 'A#' },
		{ white: 'K', black: null, note: 'C', blackNote: null },
		{ white: 'L', black: 'O', note: 'D', blackNote: 'C#' },
		{ white: ';', black: 'P', note: 'E', blackNote: 'D#' }
	],

	bottomRow: ['Z', 'X'],

	actionMap: {
		Z: { text: '8', sup: 'vb' },
		X: { text: '8', sup: 'va' }
	} as Record<string, { text: string; sup: string }>,

	// State getters
	get shiftPressed() {
		return shiftPressed;
	},
	get altPressed() {
		return altPressed;
	},
	get spacePressed() {
		return spacePressed;
	},
	get clickedActionKey() {
		return clickedActionKey;
	},
	set clickedActionKey(value: string | null) {
		clickedActionKey = value;
	},
	get spaceClicked() {
		return spaceClicked;
	},
	set spaceClicked(value: boolean) {
		spaceClicked = value;
	},

	/** Current inversion based on modifier keys: Alt = 1st, Alt+Shift = 2nd */
	get inversion(): 0 | 1 | 2 {
		if (altPressed && shiftPressed) return 2;
		if (altPressed) return 1;
		return 0;
	},

	// Helper methods
	isKeyPressed(key: string): boolean {
		return pressedKeys.has(key.toLowerCase());
	},

	isActionKeyPressed(key: string): boolean {
		return pressedKeys.has(key.toLowerCase()) || clickedActionKey === key;
	},

	getDegree(key: string): number | null {
		const num = parseInt(key);
		if (num >= 1 && num <= 7) return num;
		return null;
	},

	// Event handlers
	handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Shift') shiftPressed = true;
		if (e.key === 'Alt') altPressed = true;
		if (e.key === ' ' && !e.repeat) {
			e.preventDefault();
			spacePressed = true;
			appState.toggleMode();
		}

		const mappedKey = codeToKey[e.code];

		if (mappedKey === 'z') {
			appState.decrementChordOctave();
		}
		if (mappedKey === 'x') {
			appState.incrementChordOctave();
		}

		if (mappedKey) {
			pressedKeys.add(mappedKey);
		}

		// Handle piano keys (A-L, W-P)
		if (mappedKey && pianoKeyChars.has(mappedKey)) {
			if (!e.repeat && !pressedPianoKeys.has(mappedKey)) {
				pressedPianoKeys.add(mappedKey);
				const noteInfo = getNoteForKey(mappedKey);
				if (noteInfo) {
					appState.addPressedNote(noteInfo.note, noteInfo.octave);
					AudioService.instance.playNote(noteInfo.note, noteInfo.octave);
				}
			}
		}

		// Handle degree keys (1-7) for chord playback
		const degree = keyboardState.getDegree(mappedKey);
		if (degree && !e.repeat && !playingDegreeNotes.has(degree)) {
			const chordNotes = getChordNotesForDegree(degree, keyboardState.inversion);
			if (chordNotes.length > 0) {
				playingDegreeNotes.set(degree, chordNotes);
				appState.addPressedNotes(chordNotes);
				AudioService.instance.playNotes(chordNotes);
			}
		}
	},

	handleKeyup(e: KeyboardEvent): void {
		if (e.key === 'Shift') shiftPressed = false;
		if (e.key === 'Alt') altPressed = false;
		if (e.key === ' ') spacePressed = false;

		const mappedKey = codeToKey[e.code];

		if (mappedKey) {
			pressedKeys.delete(mappedKey);
		}

		// Handle piano key release
		if (mappedKey && pianoKeyChars.has(mappedKey)) {
			if (pressedPianoKeys.has(mappedKey)) {
				pressedPianoKeys.delete(mappedKey);
				const noteInfo = getNoteForKey(mappedKey);
				if (noteInfo) {
					appState.removePressedNote(noteInfo.note, noteInfo.octave);
					AudioService.instance.stopNote(noteInfo.note, noteInfo.octave);
				}
			}
		}

		// Handle degree key release
		const degree = keyboardState.getDegree(mappedKey);
		if (degree && playingDegreeNotes.has(degree)) {
			const chordNotes = playingDegreeNotes.get(degree)!;
			playingDegreeNotes.delete(degree);
			appState.removePressedNotes(chordNotes);
			for (const n of chordNotes) {
				AudioService.instance.stopNote(n.note, n.octave);
			}
		}
	},

	handleBlur(): void {
		AudioService.instance.stopAllNotes();
		pressedKeys.clear();
		pressedPianoKeys.clear();
		playingDegreeNotes.clear();
		currentChordNotes = [];
		currentNoteInfo = null;
		appState.pressedDegree = null;
		appState.clearPressedNotes();
		shiftPressed = false;
		altPressed = false;
		spacePressed = false;
		isDraggingDegree = false;
		isDraggingNote = false;
	},

	handleDegreeMouseDown(degree: number): void {
		isDraggingDegree = true;
		pressedKeys.add(degree.toString());

		const triads =
			appState.mode === 'major'
				? Key.majorKey(appState.selectedRoot).triads
				: Key.minorKey(Key.majorKey(appState.selectedRoot).minorRelative).natural.triads;
		const chord = triads[degree - 1];
		if (chord) {
			const formatted = FormatUtil.formatNote(chord).replace('dim', '°');
			appState.selectedChord = formatted;
			appState.selectedInversion = keyboardState.inversion;
			appState.pressedDegree = degree;

			currentChordNotes = getChordNotesForDegree(degree, keyboardState.inversion);
			if (currentChordNotes.length > 0) {
				appState.addPressedNotes(currentChordNotes);
				AudioService.instance.playNotes(currentChordNotes);
			}
		}
	},

	handleDegreeMouseEnter(degree: number): void {
		if (isDraggingDegree) {
			if (currentChordNotes.length > 0) {
				appState.removePressedNotes(currentChordNotes);
				for (const n of currentChordNotes) {
					AudioService.instance.stopNote(n.note, n.octave);
				}
			}

			keyboardState.numberRow.forEach((k) => pressedKeys.delete(k));
			pressedKeys.add(degree.toString());

			const triads =
				appState.mode === 'major'
					? Key.majorKey(appState.selectedRoot).triads
					: Key.minorKey(Key.majorKey(appState.selectedRoot).minorRelative).natural.triads;
			const chord = triads[degree - 1];
			if (chord) {
				const formatted = FormatUtil.formatNote(chord).replace('dim', '°');
				appState.selectedChord = formatted;
				appState.selectedInversion = keyboardState.inversion;
				appState.pressedDegree = degree;

				currentChordNotes = getChordNotesForDegree(degree, keyboardState.inversion);
				if (currentChordNotes.length > 0) {
					appState.addPressedNotes(currentChordNotes);
					AudioService.instance.playNotes(currentChordNotes);
				}
			}
		}
	},

	handleNoteMouseDown(noteKey: string): void {
		isDraggingNote = true;
		pressedKeys.add(noteKey.toLowerCase());

		currentNoteInfo = getNoteForKey(noteKey);
		if (currentNoteInfo) {
			appState.addPressedNote(currentNoteInfo.note, currentNoteInfo.octave);
			AudioService.instance.playNote(currentNoteInfo.note, currentNoteInfo.octave);
		}
	},

	handleNoteMouseEnter(noteKey: string): void {
		if (isDraggingNote) {
			if (currentNoteInfo) {
				appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				AudioService.instance.stopNote(currentNoteInfo.note, currentNoteInfo.octave);
			}

			pianoKeyChars.forEach((k) => pressedKeys.delete(k));
			pressedKeys.add(noteKey.toLowerCase());

			currentNoteInfo = getNoteForKey(noteKey);
			if (currentNoteInfo) {
				appState.addPressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				AudioService.instance.playNote(currentNoteInfo.note, currentNoteInfo.octave);
			}
		}
	},

	handleMouseUp(): void {
		if (isDraggingDegree) {
			keyboardState.numberRow.forEach((k) => pressedKeys.delete(k));
			appState.pressedDegree = null;

			if (currentChordNotes.length > 0) {
				appState.removePressedNotes(currentChordNotes);
				for (const n of currentChordNotes) {
					AudioService.instance.stopNote(n.note, n.octave);
				}
				currentChordNotes = [];
			}
		}
		if (isDraggingNote) {
			pianoKeyChars.forEach((k) => pressedKeys.delete(k));

			if (currentNoteInfo) {
				appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				AudioService.instance.stopNote(currentNoteInfo.note, currentNoteInfo.octave);
				currentNoteInfo = null;
			}
		}
		isDraggingDegree = false;
		isDraggingNote = false;
	}
};
