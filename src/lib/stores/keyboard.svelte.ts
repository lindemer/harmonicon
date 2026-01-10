import { Key, Chord, Note } from 'tonal';
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
	Digit9: '9',
	KeyZ: 'z',
	KeyX: 'x',
	KeyC: 'c',
	KeyV: 'v'
};

// ============ State ============

// Modifier states - track physical keyboard and virtual keyboard (mouse) separately
let shiftKeyboardPressed = $state(false);
let altKeyboardPressed = $state(false);
let tabKeyboardPressed = $state(false);
let nineKeyboardPressed = $state(false);
let ctrlKeyboardPressed = $state(false);
let shiftMousePressed = $state(false);
let altMousePressed = $state(false);
let tabMousePressed = $state(false);
let nineMousePressed = $state(false);
let ctrlMousePressed = $state(false);
let spacePressed = $state(false);

// Visual feedback state
let clickedActionKey = $state<string | null>(null);
let spaceClicked = $state(false);

// Drag states
let isDraggingDegree = $state(false);
let isDraggingNote = $state(false);
let mouseInBlackKeyZone = $state(false); // For realistic glissando behavior

// Audio tracking (internal)
const playingDegreeNotes = new SvelteMap<number, Array<{ note: string; octave: number }>>();
const playingPianoKeyChords = new SvelteMap<string, Array<{ note: string; octave: number }>>();
let currentChordNotes: Array<{ note: string; octave: number }> = [];
let currentNoteInfo: { note: string; octave: number } | null = null;

// Track which virtual keys are clicked (for visual pressed state in chord mode)
const clickedVirtualKeys = new Set<string>();
// Track chord notes for mouse-initiated chords
const mouseChordNotes = new SvelteMap<string, Array<{ note: string; octave: number }>>();

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
	inversion: 0 | 1 | 2 | 3,
	seventhMode: boolean = false,
	ninthMode: boolean = false
): Array<{ note: string; octave: number }> {
	let chord;
	if (ninthMode) {
		chord = VoicingUtil.getNinthChordForDegree(degree, appState.selectedRoot, appState.mode);
	} else if (seventhMode) {
		chord = VoicingUtil.getSeventhChordForDegree(degree, appState.selectedRoot, appState.mode);
	} else {
		chord = VoicingUtil.getChordForDegree(degree, appState.selectedRoot, appState.mode);
	}
	if (!chord || !chord.notes.length) return [];
	return VoicingUtil.getVoicedNotes(
		chord.notes,
		inversion,
		appState.chordDisplayOctave,
		appState.voicingMode
	);
}

/** Get chord notes for a given note (for chord mode playback) */
function getChordNotesForNote(
	note: string,
	isMinor: boolean
): Array<{ note: string; octave: number }> {
	// Build chord symbol: C, Cm (always triads for letter key chords)
	const chordSymbol = note + (isMinor ? 'm' : '');

	const chord = Chord.get(chordSymbol);
	if (chord.empty || !chord.notes.length) return [];

	// Use appState.chordDisplayOctave directly, just like getChordNotesForDegree
	const voicedNotes = VoicingUtil.getVoicedNotes(
		chord.notes,
		0,
		appState.chordDisplayOctave,
		appState.voicingMode
	);

	// Normalize any double sharps/flats to simpler enharmonics (e.g., F## -> G)
	return voicedNotes.map((vn) => ({
		note: Note.simplify(vn.note) || vn.note,
		octave: vn.octave
	}));
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

	bottomRow: ['Z', 'X', 'C', 'V'],

	actionMap: {
		Z: { text: 'OCTAVE', text2: 'DOWN' },
		X: { text: 'OCTAVE', text2: 'UP' }
	} as Record<string, { text: string; text2: string }>,

	// State getters/setters - combined state from keyboard and mouse
	get shiftPressed() {
		return shiftKeyboardPressed || shiftMousePressed;
	},
	get altPressed() {
		return altKeyboardPressed || altMousePressed;
	},
	get tabPressed() {
		return tabKeyboardPressed || tabMousePressed;
	},
	get ninePressed() {
		return nineKeyboardPressed || nineMousePressed;
	},
	get ctrlPressed() {
		return ctrlKeyboardPressed || ctrlMousePressed;
	},
	set ctrlMousePressed(value: boolean) {
		ctrlMousePressed = value;
	},
	// Mouse-specific setters for virtual keyboard
	set shiftMousePressed(value: boolean) {
		shiftMousePressed = value;
	},
	set altMousePressed(value: boolean) {
		altMousePressed = value;
	},
	set tabMousePressed(value: boolean) {
		// Tab is mutually exclusive with 9 key
		if (value && (nineKeyboardPressed || nineMousePressed)) return;
		tabMousePressed = value;
		appState.isSeventhMode = value || tabKeyboardPressed;
	},
	set nineMousePressed(value: boolean) {
		// 9 key is mutually exclusive with Tab, Alt, Shift
		if (
			value &&
			(tabKeyboardPressed ||
				tabMousePressed ||
				altKeyboardPressed ||
				altMousePressed ||
				shiftKeyboardPressed ||
				shiftMousePressed)
		)
			return;
		if (value) {
			// Clear other modifiers when 9 is pressed
			tabKeyboardPressed = false;
			tabMousePressed = false;
			altKeyboardPressed = false;
			altMousePressed = false;
			shiftKeyboardPressed = false;
			shiftMousePressed = false;
			appState.isSeventhMode = false;
		}
		nineMousePressed = value;
		appState.isNinthMode = value || nineKeyboardPressed;
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

	/** Current inversion based on modifiers and 7th mode
	 * In 9th mode: always 0 (no inversions)
	 * In 7th mode: Alt=1st, Shift=2nd, Alt+Shift=3rd
	 * In triad mode: Alt=1st, Shift=2nd, Alt+Shift=2nd
	 */
	get inversion(): 0 | 1 | 2 | 3 {
		// 9th mode has no inversions
		if (nineKeyboardPressed || nineMousePressed) return 0;

		const shift = shiftKeyboardPressed || shiftMousePressed;
		const alt = altKeyboardPressed || altMousePressed;
		const seventh = tabKeyboardPressed || tabMousePressed;

		if (shift && alt) {
			// Both pressed: 3rd inversion in 7th mode, 2nd inversion otherwise
			return seventh ? 3 : 2;
		}
		if (shift) return 2; // Shift alone = 2nd
		if (alt) return 1; // Alt alone = 1st
		return 0;
	},

	// Helper methods
	isKeyPressed(key: string): boolean {
		const keyLower = key.toLowerCase();

		// For piano keys, check if this key specifically is pressed
		const noteInfo = KEY_TO_NOTE[keyLower];
		if (noteInfo) {
			if (appState.playMode === 'chords') {
				// In chord mode: check if the key itself is pressed (keyboard or mouse)
				return playingPianoKeyChords.has(keyLower) || clickedVirtualKeys.has(keyLower);
			} else {
				// In notes mode: check if the corresponding note is pressed (existing behavior)
				const baseOctave = appState.chordDisplayOctave + 1;
				const octave = baseOctave + noteInfo.octaveOffset;
				return appState.pressedNotes.has(`${noteInfo.note}${octave}`);
			}
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
		const nineActive = nineKeyboardPressed || nineMousePressed;

		// Always prevent default Tab behavior
		if (e.key === 'Tab') {
			e.preventDefault();
		}

		// Track Control key
		if (e.key === 'Control') {
			ctrlKeyboardPressed = true;
			return;
		}

		// Shift, Alt, Tab are mutually exclusive with 9 key
		if (e.key === 'Shift' && !nineActive) shiftKeyboardPressed = true;
		if (e.key === 'Alt' && !nineActive) altKeyboardPressed = true;
		if (e.key === 'Tab' && !nineActive) {
			tabKeyboardPressed = true;
			appState.isSeventhMode = true;
		}
		if (e.key === ' ' && !e.repeat) {
			e.preventDefault();
			spacePressed = true;
			appState.toggleMode();
		}

		const mappedKey = codeToKey[e.code];

		// Handle 9 key for 9th chord mode (mutually exclusive with Tab, Alt, Shift)
		if (mappedKey === '9' && !e.repeat) {
			const anyModifierActive =
				tabKeyboardPressed ||
				tabMousePressed ||
				altKeyboardPressed ||
				altMousePressed ||
				shiftKeyboardPressed ||
				shiftMousePressed;
			if (!anyModifierActive) {
				nineKeyboardPressed = true;
				appState.isNinthMode = true;
			}
		}

		if (mappedKey === 'z') {
			clickedActionKey = 'Z';
			appState.decrementChordOctave();
		}
		if (mappedKey === 'x') {
			clickedActionKey = 'X';
			appState.incrementChordOctave();
		}
		if (mappedKey === 'v' && !e.repeat) {
			clickedActionKey = 'V';
			appState.toggleVoicingMode();
		}
		if (mappedKey === 'c' && !e.repeat) {
			clickedActionKey = 'C';
			appState.togglePlayMode();
		}

		// Handle piano keys (A-L, W-P)
		if (mappedKey && pianoKeyChars.has(mappedKey) && !e.repeat) {
			const noteInfo = getNoteForKey(mappedKey);
			if (!noteInfo) return;

			// Check if already playing this key
			if (appState.playMode === 'chords') {
				if (playingPianoKeyChords.has(mappedKey)) return;

				const isMinor = ctrlKeyboardPressed || ctrlMousePressed;
				// Letter key chords are always triads (no 7ths/9ths)
				const chordNotes = getChordNotesForNote(noteInfo.note, isMinor);
				if (chordNotes.length > 0) {
					playingPianoKeyChords.set(mappedKey, chordNotes);
					appState.addPressedNotes(chordNotes);
				}
			} else {
				// Notes mode - original behavior
				if (!appState.pressedNotes.has(`${noteInfo.note}${noteInfo.octave}`)) {
					appState.addPressedNote(noteInfo.note, noteInfo.octave);
				}
			}
		}

		// Handle degree keys (1-7) for chord playback
		const degree = keyboardState.getDegree(mappedKey);
		if (degree && !e.repeat && !playingDegreeNotes.has(degree)) {
			const seventhMode = keyboardState.tabPressed;
			const ninthMode = keyboardState.ninePressed;
			appState.pressedDegree = degree;
			const chordNotes = getChordNotesForDegree(
				degree,
				keyboardState.inversion,
				seventhMode,
				ninthMode
			);
			if (chordNotes.length > 0) {
				playingDegreeNotes.set(degree, chordNotes);
				appState.addPressedNotes(chordNotes);
			}
		}
	},

	handleKeyup(e: KeyboardEvent): void {
		if (e.key === 'Shift') shiftKeyboardPressed = false;
		if (e.key === 'Alt') altKeyboardPressed = false;
		if (e.key === 'Control') ctrlKeyboardPressed = false;
		if (e.key === 'Tab') {
			tabKeyboardPressed = false;
			// Only exit seventh mode if mouse tab is also not pressed
			if (!tabMousePressed) {
				appState.isSeventhMode = false;
			}
		}
		if (e.key === ' ') spacePressed = false;

		const mappedKey = codeToKey[e.code];

		// Handle 9 key release
		if (mappedKey === '9') {
			nineKeyboardPressed = false;
			// Only exit ninth mode if mouse 9 is also not pressed
			if (!nineMousePressed) {
				appState.isNinthMode = false;
			}
		}

		// Handle action key release (Z, X, V, C)
		if (mappedKey === 'z' || mappedKey === 'x' || mappedKey === 'v' || mappedKey === 'c') {
			clickedActionKey = null;
		}

		// Handle piano key release
		if (mappedKey && pianoKeyChars.has(mappedKey)) {
			// Check if this key has chord notes playing (chord mode)
			if (playingPianoKeyChords.has(mappedKey)) {
				const chordNotes = playingPianoKeyChords.get(mappedKey)!;
				playingPianoKeyChords.delete(mappedKey);
				appState.removePressedNotes(chordNotes);
			} else {
				// Notes mode - original behavior
				const noteInfo = getNoteForKey(mappedKey);
				if (noteInfo && appState.pressedNotes.has(`${noteInfo.note}${noteInfo.octave}`)) {
					appState.removePressedNote(noteInfo.note, noteInfo.octave);
				}
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
		playingPianoKeyChords.clear();
		clickedVirtualKeys.clear();
		mouseChordNotes.clear();
		currentChordNotes = [];
		currentNoteInfo = null;
		appState.pressedDegree = null;
		appState.clearPressedNotes();
		appState.isSeventhMode = false;
		appState.isNinthMode = false;
		shiftKeyboardPressed = false;
		altKeyboardPressed = false;
		tabKeyboardPressed = false;
		nineKeyboardPressed = false;
		ctrlKeyboardPressed = false;
		shiftMousePressed = false;
		altMousePressed = false;
		tabMousePressed = false;
		nineMousePressed = false;
		ctrlMousePressed = false;
		spacePressed = false;
		isDraggingDegree = false;
		isDraggingNote = false;
	},

	handleDegreeMouseDown(degree: number): void {
		isDraggingDegree = true;
		const seventhMode = keyboardState.tabPressed;
		const ninthMode = keyboardState.ninePressed;

		appState.pressedDegree = degree;
		currentChordNotes = getChordNotesForDegree(
			degree,
			keyboardState.inversion,
			seventhMode,
			ninthMode
		);
		if (currentChordNotes.length > 0) {
			appState.addPressedNotes(currentChordNotes);
		}
	},

	handleDegreeMouseEnter(degree: number): void {
		if (isDraggingDegree) {
			if (currentChordNotes.length > 0) {
				appState.removePressedNotes(currentChordNotes);
			}

			const seventhMode = keyboardState.tabPressed;
			const ninthMode = keyboardState.ninePressed;
			appState.pressedDegree = degree;
			currentChordNotes = getChordNotesForDegree(
				degree,
				keyboardState.inversion,
				seventhMode,
				ninthMode
			);
			if (currentChordNotes.length > 0) {
				appState.addPressedNotes(currentChordNotes);
			}
		}
	},

	handleNoteMouseDown(noteKey: string): void {
		isDraggingNote = true;
		const noteInfo = getNoteForKey(noteKey);
		if (!noteInfo) return;

		if (appState.playMode === 'chords') {
			// Clear any stale mouse chord state first
			for (const [key, notes] of mouseChordNotes) {
				appState.removePressedNotes(notes);
				clickedVirtualKeys.delete(key);
			}
			mouseChordNotes.clear();

			// Track which key is clicked for visual feedback
			clickedVirtualKeys.add(noteKey.toLowerCase());

			const isMinor = ctrlKeyboardPressed || ctrlMousePressed;
			// Letter key chords are always triads (no 7ths/9ths)
			const chordNotes = getChordNotesForNote(noteInfo.note, isMinor);
			if (chordNotes.length > 0) {
				mouseChordNotes.set(noteKey.toLowerCase(), chordNotes);
				appState.addPressedNotes(chordNotes);
			}
		} else {
			// Notes mode - original behavior
			currentNoteInfo = noteInfo;
			appState.addPressedNote(noteInfo.note, noteInfo.octave);
		}
	},

	handleNoteMouseEnter(noteKey: string, isBlackKey: boolean): void {
		if (!isDraggingNote) return;

		// During glissando, white keys only trigger below black key level (realistic piano behavior)
		if (!isBlackKey && mouseInBlackKeyZone) return;

		const noteInfo = getNoteForKey(noteKey);
		if (!noteInfo) return;

		if (appState.playMode === 'chords') {
			// Stop previous chord notes
			for (const [key, notes] of mouseChordNotes) {
				appState.removePressedNotes(notes);
				clickedVirtualKeys.delete(key);
			}
			mouseChordNotes.clear();

			// Start new chord
			clickedVirtualKeys.add(noteKey.toLowerCase());
			const isMinor = ctrlKeyboardPressed || ctrlMousePressed;
			const chordNotes = getChordNotesForNote(noteInfo.note, isMinor);
			if (chordNotes.length > 0) {
				mouseChordNotes.set(noteKey.toLowerCase(), chordNotes);
				appState.addPressedNotes(chordNotes);
			}
		} else {
			// Notes mode - original behavior
			if (currentNoteInfo) {
				appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
			}
			currentNoteInfo = noteInfo;
			appState.addPressedNote(noteInfo.note, noteInfo.octave);
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

		// If we crossed zones vertically, trigger the appropriate key under the cursor
		if (wasInBlackZone !== nowInBlackZone) {
			const keyUnderCursor = findKeyAtPosition(relativeX, nowInBlackZone);
			if (keyUnderCursor) {
				const noteInfo = getNoteForKey(keyUnderCursor);
				if (!noteInfo) return;

				if (appState.playMode === 'chords') {
					// Stop previous chord notes
					for (const [key, notes] of mouseChordNotes) {
						appState.removePressedNotes(notes);
						clickedVirtualKeys.delete(key);
					}
					mouseChordNotes.clear();

					// Start new chord
					clickedVirtualKeys.add(keyUnderCursor.toLowerCase());
					const isMinor = ctrlKeyboardPressed || ctrlMousePressed;
					const chordNotes = getChordNotesForNote(noteInfo.note, noteInfo.octave, isMinor, false, false);
					if (chordNotes.length > 0) {
						mouseChordNotes.set(keyUnderCursor.toLowerCase(), chordNotes);
						appState.addPressedNotes(chordNotes);
					}
				} else {
					// Notes mode - original behavior
					if (currentNoteInfo) {
						appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
					}
					currentNoteInfo = noteInfo;
					appState.addPressedNote(noteInfo.note, noteInfo.octave);
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
			if (appState.playMode === 'chords') {
				// Stop all mouse-initiated chords
				for (const [key, notes] of mouseChordNotes) {
					appState.removePressedNotes(notes);
					clickedVirtualKeys.delete(key);
				}
				mouseChordNotes.clear();
			} else {
				// Notes mode - original behavior
				if (currentNoteInfo) {
					appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
					currentNoteInfo = null;
				}
			}
		}
		isDraggingDegree = false;
		isDraggingNote = false;
	}
};
