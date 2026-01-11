/**
 * Keyboard State & Event Handling
 *
 * Manages keyboard/mouse input for the virtual keyboard.
 * Coordinates between UI events, app state, and MIDI.
 *
 * Re-exports from focused modules:
 * - $lib/constants/keyboard.constants.ts: Static layout constants
 * - modifiers.svelte.ts: Modifier key state management
 */

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { appState } from '$lib/stores/app.svelte';
import { VoicingUtil } from '$lib/utils/voicing.util';
import { KeyboardUtil } from '$lib/utils/keyboard.util';
import { ChordUtil } from '$lib/utils/chord.util';
import { midiState } from '$lib/stores/midi.svelte';
import { modifierState } from '$lib/stores/modifiers.svelte';
import {
	numberRow,
	pianoKeys,
	bottomRow,
	actionMap,
	KEY_WIDTH,
	BLACK_KEY_OFFSET
} from '$lib/constants/keyboard.constants';

// Re-export layout constants for backwards compatibility
export { numberRow, pianoKeys, bottomRow, actionMap } from '$lib/constants/keyboard.constants';
export { modifierState } from '$lib/stores/modifiers.svelte';

// ============ State ============

// Keyboard state (exported via keyboardState object)
let capsLockOn = $state(false);
let spacePressed = $state(false);
let spaceClicked = $state(false);
let clickedActionKey = $state<string | null>(null);
let nKeyPressed = $state(false);
let mKeyPressed = $state(false);

// Internal drag states (not exported)
let isDraggingDegree = $state(false);
let isDraggingNote = $state(false);
let mouseInBlackKeyZone = $state(false); // For realistic glissando behavior

// Audio tracking (internal)
const playingDegreeNotes = new SvelteMap<number, Array<{ note: string; octave: number }>>();
const playingPianoKeyChords = new SvelteMap<string, Array<{ note: string; octave: number }>>();
let currentChordNotes: Array<{ note: string; octave: number }> = [];
let currentNoteInfo: { note: string; octave: number } | null = null;

// Track which virtual keys are clicked (for visual pressed state in chord mode)
const clickedVirtualKeys = new SvelteSet<string>();
// Track chord notes for mouse-initiated chords
const mouseChordNotes = new SvelteMap<string, Array<{ note: string; octave: number }>>();

// ============ Helper Functions ============

/** Get note info for audio playback */
function getNoteForKey(key: string): { note: string; octave: number } | null {
	return KeyboardUtil.getNoteForKey(key, appState.chordDisplayOctave);
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
	isMinor: boolean,
	inversion: 0 | 1 | 2 | 3 = 0,
	isSeventh: boolean = false,
	isNinth: boolean = false
): Array<{ note: string; octave: number }> {
	return ChordUtil.getChordNotes(
		note,
		isMinor,
		inversion,
		isSeventh,
		isNinth,
		appState.chordDisplayOctave,
		appState.voicingMode
	);
}

/** Play a note or chord at the given key (used during mouse drag) */
function playMouseNoteOrChord(noteKey: string): void {
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
		const isMinor = capsLockOn;
		const chordNotes = getChordNotesForNote(
			noteInfo.note,
			isMinor,
			keyboardState.inversion,
			modifierState.tabPressed,
			modifierState.ctrlPressed
		);
		if (chordNotes.length > 0) {
			mouseChordNotes.set(noteKey.toLowerCase(), chordNotes);
			appState.addPressedNotes(chordNotes);
		}
	} else {
		// Notes mode
		if (currentNoteInfo) {
			appState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
		}
		currentNoteInfo = noteInfo;
		appState.addPressedNote(noteInfo.note, noteInfo.octave);
	}
}

/** Find which key character is at the given X position */
function findKeyAtPosition(x: number, inBlackZone: boolean): string | null {
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
	// Layout constants (re-exported for convenience)
	numberRow,
	pianoKeys,
	bottomRow,
	actionMap,

	// State accessors
	get capsLockOn() {
		return capsLockOn;
	},
	get spacePressed() {
		return spacePressed;
	},
	get spaceClicked() {
		return spaceClicked;
	},
	set spaceClicked(value: boolean) {
		spaceClicked = value;
	},
	get clickedActionKey() {
		return clickedActionKey;
	},
	set clickedActionKey(value: string | null) {
		clickedActionKey = value;
	},
	get nKeyPressed() {
		return nKeyPressed;
	},
	set nKeyPressed(value: boolean) {
		nKeyPressed = value;
	},
	get mKeyPressed() {
		return mKeyPressed;
	},
	set mKeyPressed(value: boolean) {
		mKeyPressed = value;
	},

	// Modifier state (delegated to modifierState)
	get shiftPressed() {
		return modifierState.shiftPressed;
	},
	get altPressed() {
		return modifierState.altPressed;
	},
	get tabPressed() {
		return modifierState.tabPressed;
	},
	get ninePressed() {
		return modifierState.ctrlPressed;
	},

	// Mouse-specific setters for virtual keyboard
	set shiftMousePressed(value: boolean) {
		modifierState.setShiftMouse(value);
	},
	set altMousePressed(value: boolean) {
		modifierState.setAltMouse(value);
	},
	set tabMousePressed(value: boolean) {
		modifierState.setTabMouse(value);
	},
	set ctrlMousePressed(value: boolean) {
		modifierState.setCtrlMouse(value);
	},

	/** Current inversion (delegated to modifierState) */
	get inversion(): 0 | 1 | 2 | 3 {
		return modifierState.inversion;
	},

	// Helper methods
	isKeyPressed(key: string): boolean {
		const keyLower = key.toLowerCase();

		// For piano keys, check if this key specifically is pressed
		const noteInfo = KeyboardUtil.KEY_TO_NOTE[keyLower];
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

	getDegree(key: string | undefined): number | null {
		if (!key) return null;
		const num = parseInt(key);
		if (num >= 1 && num <= 7) return num;
		return null;
	},

	// Event handlers
	handleKeydown(e: KeyboardEvent): void {
		// Always prevent default Tab behavior
		if (e.key === 'Tab') {
			e.preventDefault();
		}

		// Track Caps Lock state (toggle key, not hold key)
		capsLockOn = e.getModifierState('CapsLock');

		// Modifier keys - validation is handled by modifierState
		if (e.key === 'Shift') modifierState.setShiftKeyboard(true);
		if (e.key === 'Alt') modifierState.setAltKeyboard(true);
		if (e.key === 'Tab') modifierState.setTabKeyboard(true);
		if (e.key === 'Control' && !e.repeat) modifierState.setCtrlKeyboard(true);

		if (e.key === ' ' && !e.repeat) {
			e.preventDefault();
			spacePressed = true;
			appState.toggleMode();
		}

		const mappedKey = KeyboardUtil.codeToKey(e.code);

		if (mappedKey === 'z' && appState.chordDisplayOctave > 3) {
			clickedActionKey = 'Z';
			appState.decrementChordOctave();
		}
		if (mappedKey === 'x' && appState.chordDisplayOctave < 5) {
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
		if (mappedKey === 'n' && !e.repeat) {
			nKeyPressed = true;
			midiState.toggleInputMenu();
		}
		if (mappedKey === 'm' && !e.repeat) {
			mKeyPressed = true;
			midiState.toggleOutputMenu();
		}

		// Handle piano keys (A-L, W-P)
		if (mappedKey && KeyboardUtil.isPianoKey(mappedKey) && !e.repeat) {
			const noteInfo = getNoteForKey(mappedKey);
			if (!noteInfo) return;

			// Check if already playing this key
			if (appState.playMode === 'chords') {
				if (playingPianoKeyChords.has(mappedKey)) return;

				const isMinor = capsLockOn;
				const chordNotes = getChordNotesForNote(
					noteInfo.note,
					isMinor,
					keyboardState.inversion,
					modifierState.tabPressed,
					modifierState.ctrlPressed
				);
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
			const seventhMode = modifierState.tabPressed;
			const ninthMode = modifierState.ctrlPressed;
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
		// Track Caps Lock state on keyup too (in case it changed)
		capsLockOn = e.getModifierState('CapsLock');

		// Modifier keys - release logic handled by modifierState
		if (e.key === 'Shift') modifierState.setShiftKeyboard(false);
		if (e.key === 'Alt') modifierState.setAltKeyboard(false);
		if (e.key === 'Tab') modifierState.setTabKeyboard(false);
		if (e.key === 'Control') modifierState.setCtrlKeyboard(false);
		if (e.key === ' ') spacePressed = false;

		const mappedKey = KeyboardUtil.codeToKey(e.code);

		// Handle action key release (Z, X, V, C)
		if (mappedKey === 'z' || mappedKey === 'x' || mappedKey === 'v' || mappedKey === 'c') {
			clickedActionKey = null;
		}
		if (mappedKey === 'n') {
			nKeyPressed = false;
		}
		if (mappedKey === 'm') {
			mKeyPressed = false;
		}

		// Handle piano key release
		if (mappedKey && KeyboardUtil.isPianoKey(mappedKey)) {
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

		// Reset all modifiers
		modifierState.resetAll();

		spacePressed = false;
		// Note: capsLockOn is not reset on blur - it's a hardware toggle state
		nKeyPressed = false;
		mKeyPressed = false;
		isDraggingDegree = false;
		isDraggingNote = false;
	},

	handleDegreeMouseDown(degree: number): void {
		isDraggingDegree = true;
		const seventhMode = modifierState.tabPressed;
		const ninthMode = modifierState.ctrlPressed;

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

			const seventhMode = modifierState.tabPressed;
			const ninthMode = modifierState.ctrlPressed;
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

			const isMinor = capsLockOn;
			const chordNotes = getChordNotesForNote(
				noteInfo.note,
				isMinor,
				keyboardState.inversion,
				modifierState.tabPressed,
				modifierState.ctrlPressed
			);
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

		playMouseNoteOrChord(noteKey);
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
				playMouseNoteOrChord(keyUnderCursor);
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
