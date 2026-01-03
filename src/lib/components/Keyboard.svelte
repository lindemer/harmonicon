<script lang="ts">
	import { Key, Note } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';
	import RomanNumeral from './RomanNumeral.svelte';
	import { playNote, stopNote, playNotes, stopAllNotes } from '$lib/services/audio';

	// Get color for a degree key, accounting for inversion
	// Always uses the bass note's major degree for color - ensures minor mode shows correct colors
	// (e.g., i chord in minor mode shows purple since it's degree 6 in the relative major)
	function getDegreeColorForInversion(degree: number, inv: 0 | 1 | 2): string {
		const chord = musicState.getChordForDegree(degree);
		if (!chord || !chord.notes.length) {
			return FormatUtil.getDegreeColor(degree);
		}
		// Always use the bass note's major degree for color
		const bassNote = chord.notes[inv] ?? chord.notes[0];
		const bassDegree = musicState.getMajorDegree(bassNote);
		return FormatUtil.getDegreeColor(bassDegree ?? degree);
	}

	// Track modifier key states
	let shiftPressed = $state(false);
	let altPressed = $state(false);
	let spacePressed = $state(false);

	// Track mouse-clicked action keys (Z, X)
	let clickedActionKey = $state<string | null>(null);

	// Track mouse-clicked spacebar
	let spaceClicked = $state(false);

	// Track all pressed keys for visual feedback
	let pressedKeys = $state<Set<string>>(new Set());

	// Track mouse dragging state for glissando
	let isDraggingDegree = $state(false);
	let isDraggingNote = $state(false);

	// Track playing degree notes - stores the exact notes played per degree key
	// This ensures we stop the same notes we started, regardless of inversion changes
	let playingDegreeNotes = new Map<number, Array<{ note: string; octave: number }>>();

	// Derived inversion level based on modifiers
	// Alt = 1st inversion, Alt+Shift = 2nd inversion (shift alone does nothing)
	let inversion: 0 | 1 | 2 = $derived(altPressed && shiftPressed ? 2 : altPressed ? 1 : 0);

	// Helper to check if a key is pressed (case-insensitive)
	function isKeyPressed(key: string): boolean {
		return pressedKeys.has(key.toLowerCase());
	}

	// Helper to check if an action key is pressed (keyboard or mouse click)
	function isActionKeyPressed(key: string): boolean {
		return pressedKeys.has(key.toLowerCase()) || clickedActionKey === key;
	}

	// Piano keys that should trigger pressedNoteKey in musicState
	const pianoKeyChars = new Set(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', 'w', 'e', 't', 'y', 'u', 'o', 'p']);

	// Keyboard key to note mapping (for audio playback)
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

	// Helper to get note info for audio playback
	function getNoteForKey(key: string): { note: string; octave: number } | null {
		const keyInfo = KEY_TO_NOTE[key.toLowerCase()];
		if (!keyInfo) return null;
		// Single notes are 1 octave higher than chord display
		const octave = musicState.chordDisplayOctave + 1 + keyInfo.octaveOffset;
		return { note: keyInfo.note, octave };
	}

	// Helper to get chord notes for a degree
	// Voices chord so root is closest to the base octave's C (above or below)
	function getChordNotesForDegree(degree: number): Array<{ note: string; octave: number }> {
		const chord = musicState.getChordForDegree(degree);
		if (!chord || !chord.notes.length) return [];

		const baseOctave = musicState.chordDisplayOctave;
		const chordNotes = chord.notes;

		// Reorder notes based on current inversion
		const invertedNotes = [...chordNotes.slice(inversion), ...chordNotes.slice(0, inversion)];

		const bassNote = invertedNotes[0];
		const bassChroma = Note.chroma(bassNote);

		if (bassChroma === undefined) {
			return invertedNotes.map((note) => ({ note, octave: baseOctave }));
		}

		// Place bass note closest to the base octave's C
		// If chroma > 6 (F# to B), place in octave below (closer to C going down)
		// If chroma <= 6 (C to F), place in base octave (closer to C going up)
		const bassOctave = bassChroma > 6 ? baseOctave - 1 : baseOctave;

		return invertedNotes.map((noteName) => {
			const noteChroma = Note.chroma(noteName);
			if (noteChroma === undefined) return { note: noteName, octave: bassOctave };
			// Notes with chroma < bass go up an octave (voiced above bass)
			const octave = noteChroma < bassChroma ? bassOctave + 1 : bassOctave;
			return { note: noteName, octave };
		});
	}

	// Number row for chord degrees
	const numberRow = ['1', '2', '3', '4', '5', '6', '7'];

	// Piano keys layout - matches Logic Pro Musical Typing
	// White keys on home row, black keys on top row (Q, R, I removed - no black key there)
	// blackNote is the sharp of the PREVIOUS white key (black keys sit between white keys)
	const pianoKeys = [
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

	// Bottom row actions
	const bottomRow = ['Z', 'X'];
	const actionMap: Record<string, { text: string; sup: string }> = {
		Z: { text: '8', sup: 'vb' },
		X: { text: '8', sup: 'va' }
	};

	// Map KeyboardEvent.code to our key characters (handles Alt+key on macOS)
	const codeToKey: Record<string, string> = {
		KeyA: 'a', KeyS: 's', KeyD: 'd', KeyF: 'f', KeyG: 'g', KeyH: 'h', KeyJ: 'j', KeyK: 'k', KeyL: 'l',
		Semicolon: ';',
		KeyW: 'w', KeyE: 'e', KeyT: 't', KeyY: 'y', KeyU: 'u', KeyO: 'o', KeyP: 'p',
		Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Digit6: '6', Digit7: '7',
		KeyZ: 'z', KeyX: 'x'
	};

	// Track currently pressed piano keys for proper multi-key handling
	let pressedPianoKeys = new Set<string>();

	// Handle keydown/keyup for modifier tracking, key press tracking, and spacebar toggle
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Shift') shiftPressed = true;
		if (e.key === 'Alt') altPressed = true;
		if (e.key === ' ' && !e.repeat) {
			e.preventDefault();
			spacePressed = true;
			musicState.toggleMode();
		}

		// Use code-based lookup to handle Alt+key on macOS
		const mappedKey = codeToKey[e.code];

		if (mappedKey === 'z') {
			musicState.decrementChordOctave();
		}
		if (mappedKey === 'x') {
			musicState.incrementChordOctave();
		}

		// Track pressed key for visual feedback (use mapped key for consistency)
		if (mappedKey) {
			pressedKeys = new Set(pressedKeys).add(mappedKey);
		}

		// Handle piano keys (A-L, W-P)
		if (mappedKey && pianoKeyChars.has(mappedKey)) {
			// Play audio for the note (track to handle multi-key)
			if (!e.repeat && !pressedPianoKeys.has(mappedKey)) {
				pressedPianoKeys = new Set(pressedPianoKeys).add(mappedKey);
				const noteInfo = getNoteForKey(mappedKey);
				if (noteInfo) {
					musicState.addPressedNote(noteInfo.note, noteInfo.octave);
					playNote(noteInfo.note, noteInfo.octave);
				}
			}
		}

		// Handle degree keys (1-7) for chord playback
		const degree = getDegree(mappedKey);
		if (degree && !e.repeat && !playingDegreeNotes.has(degree)) {
			const chordNotes = getChordNotesForDegree(degree);
			if (chordNotes.length > 0) {
				playingDegreeNotes.set(degree, chordNotes); // Store exact notes played
				musicState.addPressedNotes(chordNotes);
				playNotes(chordNotes);
			}
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		if (e.key === 'Shift') shiftPressed = false;
		if (e.key === 'Alt') altPressed = false;
		if (e.key === ' ') spacePressed = false;

		// Use code-based lookup to handle Alt+key on macOS
		const mappedKey = codeToKey[e.code];

		// Clear pressed key
		if (mappedKey) {
			const newSet = new Set(pressedKeys);
			newSet.delete(mappedKey);
			pressedKeys = newSet;
		}

		// Handle piano key release
		if (mappedKey && pianoKeyChars.has(mappedKey)) {
			// Remove from pressed piano keys and stop audio
			if (pressedPianoKeys.has(mappedKey)) {
				const newPianoKeys = new Set(pressedPianoKeys);
				newPianoKeys.delete(mappedKey);
				pressedPianoKeys = newPianoKeys;

				const noteInfo = getNoteForKey(mappedKey);
				if (noteInfo) {
					musicState.removePressedNote(noteInfo.note, noteInfo.octave);
					stopNote(noteInfo.note, noteInfo.octave);
				}
			}
		}

		// Handle degree key release - stop chord notes using stored notes
		const degree = getDegree(mappedKey);
		if (degree && playingDegreeNotes.has(degree)) {
			const chordNotes = playingDegreeNotes.get(degree)!; // Get stored notes
			playingDegreeNotes.delete(degree);
			musicState.removePressedNotes(chordNotes);
			for (const n of chordNotes) {
				stopNote(n.note, n.octave);
			}
		}
	}

	// Handle window blur - stop all notes to prevent stuck keys
	function handleBlur() {
		stopAllNotes();
		pressedKeys = new Set();
		pressedPianoKeys = new Set();
		playingDegreeNotes.clear();
		currentChordNotes = [];
		currentNoteInfo = null;
		musicState.pressedDegree = null;
		musicState.clearPressedNotes();
		shiftPressed = false;
		altPressed = false;
		spacePressed = false;
		isDraggingDegree = false;
		isDraggingNote = false;
	}

	// Get degree for a number key (1-7)
	function getDegree(key: string): number | null {
		const num = parseInt(key);
		if (num >= 1 && num <= 7) return num;
		return null;
	}

	// Get roman numeral for a degree
	function getRomanNumeral(degree: number): string {
		return FormatUtil.getDiatonicRomanNumeral(degree, musicState.mode);
	}

	// Get color for a note based on its position in the major scale
	function getNoteColor(noteName: string): string | undefined {
		const degree = musicState.getMajorDegree(noteName);
		if (degree === null) return undefined;
		return FormatUtil.getDegreeColor(degree);
	}

	// Track currently playing chord notes for proper cleanup
	let currentChordNotes: Array<{ note: string; octave: number }> = [];
	let currentNoteInfo: { note: string; octave: number } | null = null;

	// Mouse handlers for glissando-style playing
	function handleDegreeMouseDown(degree: number) {
		isDraggingDegree = true;
		pressedKeys = new Set(pressedKeys).add(degree.toString());

		// Trigger chord selection (mirror +layout.svelte keydown logic)
		const triads = musicState.mode === 'major'
			? Key.majorKey(musicState.selectedRoot).triads
			: Key.minorKey(Key.majorKey(musicState.selectedRoot).minorRelative).natural.triads;
		const chord = triads[degree - 1];
		if (chord) {
			const formatted = FormatUtil.formatNote(chord).replace('dim', '°');
			musicState.selectedChord = formatted;
			musicState.selectedInversion = inversion;
			musicState.pressedDegree = degree;

			// Play chord audio
			currentChordNotes = getChordNotesForDegree(degree);
			if (currentChordNotes.length > 0) {
				musicState.addPressedNotes(currentChordNotes);
				playNotes(currentChordNotes);
			}
		}
	}

	function handleDegreeMouseEnter(degree: number) {
		if (isDraggingDegree) {
			// Stop previous chord and remove from state
			if (currentChordNotes.length > 0) {
				musicState.removePressedNotes(currentChordNotes);
				for (const n of currentChordNotes) {
					stopNote(n.note, n.octave);
				}
			}

			// Clear previous degree key from pressed state
			const newSet = new Set<string>();
			newSet.add(degree.toString());
			pressedKeys = newSet;

			// Select new chord
			const triads = musicState.mode === 'major'
				? Key.majorKey(musicState.selectedRoot).triads
				: Key.minorKey(Key.majorKey(musicState.selectedRoot).minorRelative).natural.triads;
			const chord = triads[degree - 1];
			if (chord) {
				const formatted = FormatUtil.formatNote(chord).replace('dim', '°');
				musicState.selectedChord = formatted;
				musicState.selectedInversion = inversion;
				musicState.pressedDegree = degree;

				// Play new chord audio
				currentChordNotes = getChordNotesForDegree(degree);
				if (currentChordNotes.length > 0) {
					musicState.addPressedNotes(currentChordNotes);
					playNotes(currentChordNotes);
				}
			}
		}
	}

	function handleNoteMouseDown(noteKey: string) {
		isDraggingNote = true;
		pressedKeys = new Set(pressedKeys).add(noteKey.toLowerCase());

		// Play audio for the note
		currentNoteInfo = getNoteForKey(noteKey);
		if (currentNoteInfo) {
			musicState.addPressedNote(currentNoteInfo.note, currentNoteInfo.octave);
			playNote(currentNoteInfo.note, currentNoteInfo.octave);
		}
	}

	function handleNoteMouseEnter(noteKey: string) {
		if (isDraggingNote) {
			// Stop previous note and remove from state
			if (currentNoteInfo) {
				musicState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				stopNote(currentNoteInfo.note, currentNoteInfo.octave);
			}

			// Clear previous note key from pressed state, add new one
			const newSet = new Set(pressedKeys);
			// Remove all piano key chars
			pianoKeyChars.forEach(k => newSet.delete(k));
			newSet.add(noteKey.toLowerCase());
			pressedKeys = newSet;

			// Play new note audio
			currentNoteInfo = getNoteForKey(noteKey);
			if (currentNoteInfo) {
				musicState.addPressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				playNote(currentNoteInfo.note, currentNoteInfo.octave);
			}
		}
	}

	function handleMouseUp() {
		if (isDraggingDegree) {
			// Clear degree key pressed states
			const newSet = new Set(pressedKeys);
			numberRow.forEach(k => newSet.delete(k));
			pressedKeys = newSet;
			musicState.pressedDegree = null;

			// Stop chord audio
			if (currentChordNotes.length > 0) {
				musicState.removePressedNotes(currentChordNotes);
				for (const n of currentChordNotes) {
					stopNote(n.note, n.octave);
				}
				currentChordNotes = [];
			}
		}
		if (isDraggingNote) {
			// Clear note key pressed states
			const newSet = new Set(pressedKeys);
			pianoKeyChars.forEach(k => newSet.delete(k));
			pressedKeys = newSet;

			// Stop note audio
			if (currentNoteInfo) {
				musicState.removePressedNote(currentNoteInfo.note, currentNoteInfo.octave);
				stopNote(currentNoteInfo.note, currentNoteInfo.octave);
				currentNoteInfo = null;
			}
		}
		isDraggingDegree = false;
		isDraggingNote = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} onblur={handleBlur} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="keyboard-container" onmouseup={handleMouseUp} onmouseleave={handleMouseUp} role="application">
	<div class="keyboard">
		<!-- Number row -->
		<div class="row number-row">
			{#each numberRow as key}
				{@const degree = getDegree(key)}
				<div
					class="key degree-key"
					class:pressed={isKeyPressed(key)}
					style:background-color={degree ? getDegreeColorForInversion(degree, inversion) : undefined}
					onmousedown={() => degree && handleDegreeMouseDown(degree)}
					onmouseenter={() => degree && handleDegreeMouseEnter(degree)}
					role="button"
					tabindex="0"
				>
					<span class="key-label">{key}</span>
					{#if degree}
						<span class="key-function"><RomanNumeral numeral={getRomanNumeral(degree)} inversion={inversion} /></span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Piano keys section -->
		<div class="piano-section">
			{#each pianoKeys as pk, i}
				{@const whiteNoteColor = getNoteColor(pk.note)}
				{@const blackNoteColor = pk.blackNote ? getNoteColor(pk.blackNote) : undefined}
				<!-- White key (tall, extends from home row up) -->
				<div
					class="white-key"
					class:pressed={isKeyPressed(pk.white)}
					style:--key-index={i}
					onmousedown={() => handleNoteMouseDown(pk.white)}
					onmouseenter={() => handleNoteMouseEnter(pk.white)}
					role="button"
					tabindex="0"
				>
					<div class="white-key-top"></div>
					<div class="white-key-bottom">
						<span class="key-label">{pk.white}</span>
						<span class="key-function font-music" style:color={whiteNoteColor ?? '#f3f4f6'}>{pk.note}</span>
					</div>
				</div>
				<!-- Black key (if present) -->
				{#if pk.black && pk.blackNote}
					<div
						class="black-key"
						class:pressed={isKeyPressed(pk.black)}
						style:--key-index={i}
						onmousedown={() => pk.black && handleNoteMouseDown(pk.black)}
						onmouseenter={() => pk.black && handleNoteMouseEnter(pk.black)}
						role="button"
						tabindex="0"
					>
						<span class="key-label">{pk.black}</span>
						<span class="key-function font-music" style:color={blackNoteColor ?? '#f3f4f6'}>{FormatUtil.formatNote(pk.blackNote)}</span>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Bottom row -->
		<div class="row bottom-row">
			<!-- Shift key -->
			<div class="key wide-key modifier-key" class:pressed={shiftPressed}>
				<span class="key-label">⇧</span>
				<span class="key-function font-music">2<sup>nd</sup></span>
			</div>

			{#each bottomRow as key}
				{@const action = actionMap[key]}
				<div
					class="key action-key"
					class:pressed={isActionKeyPressed(key)}
					onmousedown={() => {
						clickedActionKey = key;
						if (key === 'Z') musicState.decrementChordOctave();
						else musicState.incrementChordOctave();
					}}
					onmouseup={() => clickedActionKey = null}
					onmouseleave={() => clickedActionKey = null}
					role="button"
					tabindex="0"
				>
					<span class="key-label">{key}</span>
					{#if action}
						<span class="key-function font-music">{action.text}<sup>{action.sup}</sup></span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Modifier row -->
		<div class="row">
			<div class="key modifier-key disabled-key">
				<span class="key-label">ctrl</span>
			</div>
			<div class="key modifier-key" class:pressed={altPressed}>
				<span class="key-label">⌥</span>
				<span class="key-function font-music">1<sup>st</sup></span>
			</div>
			<div class="key modifier-key disabled-key">
				<span class="key-label">⌘</span>
			</div>
			<div
				class="key space-key"
				class:pressed={spacePressed || spaceClicked}
				onmousedown={() => {
					spaceClicked = true;
					musicState.toggleMode();
				}}
				onmouseup={() => spaceClicked = false}
				onmouseleave={() => spaceClicked = false}
				onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); musicState.toggleMode(); } }}
				role="button"
				tabindex="0"
			>
				<span class="key-function mode-toggle font-music">
					<span class:active-mode={musicState.mode === 'major'} class:inactive-mode={musicState.mode !== 'major'}>Δ</span>
					<span class="mode-separator">/</span>
					<span class:active-mode={musicState.mode === 'minor'} class:inactive-mode={musicState.mode !== 'minor'}>m</span>
				</span>
			</div>
		</div>
	</div>
</div>

<style>
	.keyboard-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		user-select: none;
	}

	.keyboard {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.row {
		display: flex;
		gap: 4px;
		justify-content: center;
	}

	.number-row {
		margin-left: calc(-4 * 68px - 42px);
	}

	.key {
		min-width: 64px;
		height: 64px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #374151;
		border-radius: 6px;
		padding: 4px 6px;
		gap: 3px;
		cursor: pointer;
		transition:
			filter 0.08s ease,
			transform 0.08s ease;
	}

	.key:hover {
		filter: brightness(1.15);
	}

	.key:focus {
		outline: none;
	}

	.key-label {
		font-size: 10px;
		color: #9ca3af;
		font-family: system-ui, sans-serif;
		text-transform: uppercase;
	}

	.key-function {
		font-size: 20px;
		color: #e5e7eb;
		line-height: 1;
	}

	/* Piano section - positioned layout */
	.piano-section {
		position: relative;
		height: 128px;
		width: calc(10 * 68px);
	}

	/* White keys - tall piano-style */
	.white-key {
		position: absolute;
		left: calc(var(--key-index) * 68px);
		width: 64px;
		height: 128px;
		display: flex;
		flex-direction: column;
		border-radius: 6px;
		overflow: hidden;
		cursor: pointer;
		transition:
			filter 0.08s ease,
			transform 0.08s ease;
	}

	.white-key:hover {
		filter: brightness(1.15);
	}

	.white-key:focus {
		outline: none;
	}

	.white-key.pressed {
		/* Scale down and translate up so top edge stays fixed */
		/* 128px height * 0.03 (3% shrink) / 2 = ~2px offset */
		transform: scale(0.97) translateY(-2px);
		filter: brightness(0.85);
	}

	.white-key-top {
		flex: 1;
		background: #4b5563;
		border-radius: 6px 6px 0 0;
	}

	.white-key-bottom {
		height: 64px;
		background: #4b5563;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		border-radius: 0 0 6px 6px;
	}

	.white-key .key-function {
		color: #f3f4f6;
		font-size: 20px;
	}

	/* Black keys - square, positioned between white keys */
	.black-key {
		position: absolute;
		left: calc(var(--key-index) * 68px - 26px);
		width: 64px;
		height: 64px;
		background: #1f2937;
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		z-index: 1;
		cursor: pointer;
		transition:
			filter 0.08s ease,
			transform 0.08s ease,
			background-color 0.08s ease;
	}

	.black-key:hover {
		filter: brightness(1.25);
	}

	.black-key:focus {
		outline: none;
	}

	.black-key.pressed {
		/* Scale down and translate up so top edge stays fixed */
		/* 64px height * 0.05 (5% shrink) / 2 = ~1.6px offset */
		transform: scale(0.95) translateY(-1.6px);
		background: #374151;
		filter: brightness(0.9);
	}

	.black-key .key-label {
		color: #6b7280;
	}

	.black-key .key-function {
		color: #9ca3af;
		font-size: 16px;
	}

	/* Degree keys (1-7) with colored backgrounds */
	.degree-key .key-label {
		color: rgba(255, 255, 255, 0.7);
	}

	.degree-key .key-function {
		color: white;
		font-weight: 500;
	}

	.degree-key.pressed {
		transform: scale(0.95);
		filter: brightness(0.8);
	}

	/* Action keys (Z, X for octave) */
	.action-key {
		background: #4b5563;
	}

	.action-key .key-function {
		color: #f3f4f6;
	}

	.action-key.pressed {
		transform: scale(0.95);
		filter: brightness(0.8);
	}

	/* Modifier keys */
	.modifier-key {
		background: #1f2937;
		cursor: default;
	}

	.modifier-key:hover {
		filter: none;
	}

	.modifier-key .key-label,
	.modifier-key .key-function {
		color: #f3f4f6;
	}

	.modifier-key.pressed {
		transform: scale(0.95) translateY(-1.6px);
		filter: brightness(0.8);
	}

	/* Disabled keys (ctrl, cmd) - no function */
	.disabled-key {
		cursor: default;
	}

	.disabled-key:hover {
		filter: none;
	}

	.disabled-key .key-label {
		color: #4b5563;
	}

	/* Wide keys */
	.wide-key {
		min-width: 96px;
	}

	.space-key {
		min-width: 320px;
		background: #374151;
	}

	.space-key.pressed {
		transform: scale(0.98) translateY(-1px);
		filter: brightness(0.8);
	}

	.mode-toggle {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.mode-separator {
		color: #6b7280;
	}

	.active-mode {
		color: #f3f4f6;
	}

	.inactive-mode {
		color: #6b7280;
	}

	.bottom-row {
		justify-content: flex-start;
		padding-left: 20px;
	}
</style>
