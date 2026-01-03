/**
 * Constants for the Piano component.
 * Centralizes all dimensions and note definitions for easier maintenance.
 */

export const PIANO_DIMENSIONS = {
	whiteKey: {
		width: 24,
		height: 120,
		gap: 1,
		radius: 3,
		labelRadius: 10
	},
	blackKey: {
		width: 16,
		height: 72,
		radius: 3,
		labelRadius: 7
	},
	/** Number of octaves displayed (not counting final C) */
	octaves: 5,
	/** Height of the octave label row above the keys */
	octaveLabelHeight: 16
} as const;

/** White key note names in order */
export const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

/** Indices of white keys that have a black key to their right (C, D, F, G, A) */
export const BLACK_KEY_POSITIONS = [0, 1, 3, 4, 5] as const;

/** Derived dimensions for SVG sizing */
export const PIANO_SVG = {
	/** Total number of white keys: 5 octaves × 7 + 1 (final C) */
	get totalWhiteKeys() {
		return WHITE_NOTES.length * PIANO_DIMENSIONS.octaves + 1;
	},
	/** Total width of the SVG */
	get width() {
		return this.totalWhiteKeys * PIANO_DIMENSIONS.whiteKey.width;
	},
	/** Total height of the SVG (keys + octave labels) */
	get height() {
		return PIANO_DIMENSIONS.whiteKey.height + PIANO_DIMENSIONS.octaveLabelHeight;
	}
} as const;
