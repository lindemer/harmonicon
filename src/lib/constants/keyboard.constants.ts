export interface PianoKeyMapping {
	white: string;
	black: string | null;
	note: string;
	blackNote: string | null;
}

export interface ActionMapping {
	text: string;
	text2: string;
}

/** Number row keys (1-7 for scale degrees) */
export const numberRow = ['1', '2', '3', '4', '5', '6', '7'];

/** Piano key mappings - maps keyboard keys to notes */
export const pianoKeys: PianoKeyMapping[] = [
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
];

/** Bottom row action keys */
export const bottomRow = ['Z', 'X', 'C', 'V', 'B'];

/** Action key mappings */
export const actionMap: Record<string, ActionMapping> = {
	Z: { text: 'OCTAVE', text2: 'DOWN' },
	X: { text: 'OCTAVE', text2: 'UP' }
};

/** Piano key dimensions for mouse interaction */
export const KEY_WIDTH = 68; // Each key is 64px wide with 4px gap
export const BLACK_KEY_OFFSET = 26; // Black keys offset from white key boundary
