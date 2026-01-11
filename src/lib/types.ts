/**
 * Core type definitions for Harmonicon
 *
 * This file contains shared types used across the application.
 * Types specific to individual modules should remain in those modules.
 */

// ============ Music Theory Types ============

/** Scale mode - major or minor */
export type Mode = 'major' | 'minor';

/** Chord voicing style */
export type VoicingMode = 'open' | 'closed';

/** Keyboard play mode - individual notes or full chords */
export type PlayMode = 'notes' | 'chords';

/** Seventh chord style - classic (diatonic) or modern (always flat 7th) */
export type SeventhStyle = 'classic' | 'modern';

/** Chord inversion (0 = root position, 1-3 = inversions) */
export type Inversion = 0 | 1 | 2 | 3;

/** Scale degree (1-7) */
export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ============ Note Types ============

/** A note with its octave */
export interface NoteInfo {
	note: string;
	octave: number;
}

/** A collection of notes (e.g., chord notes) */
export type ChordNotes = NoteInfo[];

/** Source of a pressed note (for tracking purposes) */
export type PressedNoteSource = 'keyboard' | 'midi' | 'mouse' | 'degree';

// ============ Chord Types ============

/** Detected chord information from pressed notes */
export interface DetectedChord {
	symbol: string; // Full chord symbol (e.g., "Am7")
	bass: string | null; // Bass note if inverted (e.g., "E")
	inversion: Inversion;
}

/** Chord display information for UI */
export interface ChordDisplayInfo {
	root: string;
	bassNote: string | undefined;
}

// ============ Keyboard Layout Types ============

/** Piano key mapping (keyboard key to note) */
export interface PianoKeyMapping {
	white: string;
	black: string | null;
	note: string;
	blackNote: string | null;
}

/** Action key display text */
export interface ActionMapping {
	text: string;
	text2: string;
}

// ============ Event Types ============

/** Note event types for the decoupled event system */
export type NoteEventType = 'note-on' | 'note-off';

/** Note event data */
export interface NoteEvent {
	type: NoteEventType;
	note: string;
	octave: number;
	velocity?: number;
}

// ============ Modifier Types ============

/** Modifier key names */
export type ModifierName = 'shift' | 'alt' | 'tab' | 'ctrl';
