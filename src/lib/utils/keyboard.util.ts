/**
 * Utility class for keyboard-to-note mappings.
 * Pure static functions with no state dependencies.
 */
export class KeyboardUtil {
	/** Keyboard key to note mapping (for audio playback) */
	static readonly KEY_TO_NOTE: Record<string, { note: string; octaveOffset: number }> = {
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
	static readonly CODE_TO_KEY: Record<string, string> = {
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
		KeyX: 'x',
		KeyC: 'c',
		KeyV: 'v',
		KeyB: 'b',
		KeyN: 'n',
		KeyM: 'm',
		Comma: ',',
		Period: '.'
	};

	/** Piano key characters that trigger note playback */
	static readonly PIANO_KEY_CHARS = new Set([
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

	/**
	 * Get note info for a keyboard key.
	 * @param key - Keyboard key character (lowercase)
	 * @param baseOctave - Base octave for the keyboard layout
	 * @returns Note name and octave, or null if not a piano key
	 */
	static getNoteForKey(key: string, baseOctave: number): { note: string; octave: number } | null {
		const keyInfo = this.KEY_TO_NOTE[key.toLowerCase()];
		if (!keyInfo) return null;
		const octave = baseOctave + 1 + keyInfo.octaveOffset;
		return { note: keyInfo.note, octave };
	}

	/**
	 * Check if a key character is a piano key.
	 * @param key - Keyboard key character (undefined returns false)
	 */
	static isPianoKey(key: string | undefined): key is string {
		return key !== undefined && this.PIANO_KEY_CHARS.has(key.toLowerCase());
	}

	/**
	 * Map KeyboardEvent.code to key character.
	 * Useful for handling Alt+key combinations on macOS.
	 * @param code - KeyboardEvent.code value
	 * @returns Key character or undefined if not mapped
	 */
	static codeToKey(code: string): string | undefined {
		return this.CODE_TO_KEY[code];
	}
}
