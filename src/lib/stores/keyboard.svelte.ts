import { Key } from 'tonal';
import { SvelteMap } from 'svelte/reactivity';
import { appState } from '$lib/stores/app.svelte';
import { FormatUtil } from '$lib/utils/format.util';
import { VoicingUtil } from '$lib/utils/voicing.util';

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

// Modifier states - track physical keyboard and virtual keyboard (mouse) separately
let shiftKeyboardPressed = $state(false);
let altKeyboardPressed = $state(false);
let shiftMousePressed = $state(false);
let altMousePressed = $state(false);
let spacePressed = $state(false);

// Visual feedback state
let clickedActionKey = $state<string | null>(null);
let spaceClicked = $state(false);

// Drag states
let isDraggingDegree = $state(false);
let isDraggingNote = $state(false);
let mouseInBlackKeyZone = $state(false); // For realistic glissando behavior
let lastMouseX = 0; // Track X position for zone transitions

// Audio tracking (internal)
const playingDegreeNotes = new SvelteMap<number, Array<{ note: string; octave: number }>>();
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

/** Piano key layout: each key is 64px wide with 4px gap, total 68px per key */
const KEY_WIDTH = 68;
const BLACK_KEY_OFFSET = 26; // Black keys are offset 26px to the left of white key boundary

/** Find which key character is at the given X position */
function findKeyAtPosition(x: number, inBlackZone: boolean): string | null {
	const pianoKeys = keyboardState.pianoKeys;

	if (inBlackZone) {
		// Check black keys - they're positioned between white keys
		for (let i = 0; i < pianoKeys.length; i++) {
			const pk = pianoKeys[i];
			if (pk.black) {
				// Black key position: (index * 68) - 26, width 64
				const blackKeyLeft = i * KEY_WIDTH - BLACK_KEY_OFFSET;
				const blackKeyRight = blackKeyLeft + 64;
				if (x >= blackKeyLeft && x <= blackKeyRight) {
					return pk.black;
				}
			}
		}
	} else {
		// Check white keys
		for (let i = 0; i < pianoKeys.length; i++) {
			const pk = pianoKeys[i];
			// White key position: index * 68, width 64
			const whiteKeyLeft = i * KEY_WIDTH;
			const whiteKeyRight = whiteKeyLeft + 64;
			if (x >= whiteKeyLeft && x <= whiteKeyRight) {
				return pk.white;
			}
		}
	}
	return null;
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

	// State getters/setters - combined state from keyboard and mouse
	get shiftPressed() {
		return shiftKeyboardPressed || shiftMousePressed;
	},
	get altPressed() {
		return altKeyboardPressed || altMousePressed;
	},
	// Mouse-specific setters for virtual keyboard
	set shiftMousePressed(value: boolean) {
		shiftMousePressed = value;
	},
	set altMousePressed(value: boolean) {
		altMousePressed = value;
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

	/** Current inversion: Alt = 1st, Shift = 2nd */
	get inversion(): 0 | 1 | 2 {
		if (shiftKeyboardPressed || shiftMousePressed) return 2; // Shift (with or without Alt) = 2nd
		if (altKeyboardPressed || altMousePressed) return 1; // Alt alone = 1st
		return 0;
	},

	// Helper methods
	isKeyPressed(key: string): boolean {
		const keyLower = key.toLowerCase();

		// For piano keys, derive from appState.pressedNotes
		const noteInfo = KEY_TO_NOTE[keyLower];
		if (noteInfo) {
			const baseOctave = appState.chordDisplayOctave + 1;
			const octave = baseOctave + noteInfo.octaveOffset;
			return appState.pressedNotes.has(`${noteInfo.note}${octave}`);
		}

		// For degree keys (1-7), derive from appState.pressedDegree
		const degree = parseInt(keyLower);
		if (degree >= 1 && degree <= 7) {
			return appState.pressedDegree === degree;
		}

		return false;
	},

	isActionKeyPressed(key: string): boolean {
		return clickedActionKey === key;
	},

	getDegree(key: string): number | null {
		const num = parseInt(key);
		if (num >= 1 && num <= 7) return num;
		return null;
	},

	// Event handlers
	handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Shift') shiftKeyboardPressed = true;
		if (e.key === 'Alt') altKeyboardPressed = true;
		if (e.key === ' ' && !e.repeat) {
			e.preventDefault();
			spacePressed = true;
			appState.toggleMode();
		}

		const mappedKey = codeToKey[e.code];

		if (mappedKey === 'z') {
			clickedActionKey = 'Z';
			appState.decrementChordOctave();
		}
		if (mappedKey === 'x') {
			clickedActionKey = 'X';
			appState.incrementChordOctave();
		}

		// Handle piano keys (A-L, W-P)
		if (mappedKey && pianoKeyChars.has(mappedKey)) {
			const noteInfo = getNoteForKey(mappedKey);
			if (
				noteInfo &&
				!e.repeat &&
				!appState.pressedNotes.has(`${noteInfo.note}${noteInfo.octave}`)
			) {
				appState.addPressedNote(noteInfo.note, noteInfo.octave);
			}
		}

		// Handle degree keys (1-7) for chord playback
		const degree = keyboardState.getDegree(mappedKey);
		if (degree && !e.repeat && !playingDegreeNotes.has(degree)) {
			// Get chord symbol for this degree (same logic as handleDegreeMouseDown)
			const triads =
				appState.mode === 'major'
					? Key.majorKey(appState.selectedRoot).triads
					: Key.minorKey(Key.majorKey(appState.selectedRoot).minorRelative).natural.triads;
			const chord = triads[degree - 1];
			if (chord) {
				const formatted = FormatUtil.formatNote(chord).replace('dim', '°');
				appState.selectedChord = formatted;
			}
			appState.pressedDegree = degree;
			appState.selectedInversion = keyboardState.inversion;
			const chordNotes = getChordNotesForDegree(degree, keyboardState.inversion);
			if (chordNotes.length > 0) {
				playingDegreeNotes.set(degree, chordNotes);
				appState.addPressedNotes(chordNotes);
			}
		}
	},

	handleKeyup(e: KeyboardEvent): void {
		if (e.key === 'Shift') shiftKeyboardPressed = false;
		if (e.key === 'Alt') altKeyboardPressed = false;
		if (e.key === ' ') spacePressed = false;

		const mappedKey = codeToKey[e.code];

		// Handle action key release (Z, X)
		if (mappedKey === 'z' || mappedKey === 'x') {
			clickedActionKey = null;
		}

		// Handle piano key release
		if (mappedKey && pianoKeyChars.has(mappedKey)) {
			const noteInfo = getNoteForKey(mappedKey);
			if (noteInfo && appState.pressedNotes.has(`${noteInfo.note}${noteInfo.octave}`)) {
				appState.removePressedNote(noteInfo.note, noteInfo.octave);
			}
		}

		// Handle degree key release
		const degree = keyboardState.getDegree(mappedKey);
		if (degree && playingDegreeNotes.has(degree)) {
			appState.pressedDegree = null;
			const chordNotes = playingDegreeNotes.get(degree)!;
			playingDegreeNotes.delete(degree);
			appState.removePressedNotes(chordNotes);
		}
	},

	handleBlur(): void {
		playingDegreeNotes.clear();
		currentChordNotes = [];
		currentNoteInfo = null;
		appState.pressedDegree = null;
		appState.clearPressedNotes();
		shiftKeyboardPressed = false;
		altKeyboardPressed = false;
		shiftMousePressed = false;
		altMousePressed = false;
		spacePressed = false;
		isDraggingDegree = false;
		isDraggingNote = false;
	},

	handleDegreeMouseDown(degree: number): void {
		isDraggingDegree = true;

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
			}
		}
	},

	handleDegreeMouseEnter(degree: number): void {
		if (isDraggingDegree) {
			if (currentChordNotes.length > 0) {
				appState.removePressedNotes(currentChordNotes);
			}

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
				}
			}
		}
	},

	handleNoteMouseDown(noteKey: string): void {
		isDraggingNote = true;

		currentNoteInfo = getNoteForKey(noteKey);
		if (currentNoteInfo) {
			appState.addPressedNote(currentNoteInfo.note, currentNoteInfo.octave);
		}
	},

	handleNoteMouseEnter(noteKey: string, isBlackKey: boolean): void {
		if (isDraggingNote) {
			// During glissando, white keys only trigger below black key level (realistic piano behavior)
			if (!isBlackKey && mouseInBlackKeyZone) {
				return;
			}

			if (currentNoteInfo) {
				appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
			}

			currentNoteInfo = getNoteForKey(noteKey);
			if (currentNoteInfo) {
				appState.addPressedNote(currentNoteInfo.note, currentNoteInfo.octave);
			}
		}
	},

	handlePianoSectionMouseMove(e: MouseEvent): void {
		if (!isDraggingNote) return;
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const relativeX = e.clientX - rect.left;
		const relativeY = e.clientY - rect.top;

		// Check if we crossed the black key threshold (64px)
		const wasInBlackZone = mouseInBlackKeyZone;
		const nowInBlackZone = relativeY <= 64;
		mouseInBlackKeyZone = nowInBlackZone;
		lastMouseX = relativeX;

		// If we crossed zones vertically, trigger the appropriate key under the cursor
		if (wasInBlackZone !== nowInBlackZone) {
			const keyUnderCursor = findKeyAtPosition(relativeX, nowInBlackZone);
			if (keyUnderCursor) {
				if (currentNoteInfo) {
					appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				}
				currentNoteInfo = getNoteForKey(keyUnderCursor);
				if (currentNoteInfo) {
					appState.addPressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				}
			}
		}
	},

	handleMouseUp(): void {
		if (isDraggingDegree) {
			appState.pressedDegree = null;

			if (currentChordNotes.length > 0) {
				appState.removePressedNotes(currentChordNotes);
				currentChordNotes = [];
			}
		}
		if (isDraggingNote) {
			if (currentNoteInfo) {
				appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				currentNoteInfo = null;
			}
		}
		isDraggingDegree = false;
		isDraggingNote = false;
	}
};
