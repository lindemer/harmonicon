<script lang="ts">
	import { Chord, Note } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';
	import {
		PIANO_DIMENSIONS,
		PIANO_SVG,
		WHITE_NOTES,
		BLACK_KEY_POSITIONS
	} from '$lib/constants/piano';
	import { playNote, stopNote, stopAllNotes } from '$lib/services/audio';

	const { whiteKey, blackKey, octaves, octaveLabelHeight } = PIANO_DIMENSIONS;
	const { width: svgWidth, height: svgHeight } = PIANO_SVG;

	// Mouse drag state for glissando-style playing
	let isDragging = $state(false);
	let directPressedNote = $state<{ note: string; octave: number } | null>(null);

	type KeyInfo = {
		note: string;
		octave: number;
		isBlack: boolean;
		x: number;
		label: string;
	};

	function buildKeys(startOctave: number): KeyInfo[] {
		const keys: KeyInfo[] = [];

		// White keys first (rendered below black keys)
		for (let oct = 0; oct < octaves; oct++) {
			const octave = startOctave + oct;
			WHITE_NOTES.forEach((note, i) => {
				keys.push({
					note,
					octave,
					isBlack: false,
					x: (oct * 7 + i) * whiteKey.width,
					label: note
				});
			});
		}
		// Add the final C white key
		keys.push({
			note: 'C',
			octave: startOctave + octaves,
			isBlack: false,
			x: octaves * 7 * whiteKey.width,
			label: 'C'
		});

		// Black keys (rendered on top)
		for (let oct = 0; oct < octaves; oct++) {
			const octave = startOctave + oct;
			BLACK_KEY_POSITIONS.forEach((whiteIndex) => {
				const blackNote = WHITE_NOTES[whiteIndex] + '#';
				keys.push({
					note: blackNote,
					octave,
					isBlack: true,
					x: (oct * 7 + whiteIndex) * whiteKey.width + whiteKey.width - blackKey.width / 2,
					label: FormatUtil.formatNote(blackNote)
				});
			});
		}

		return keys;
	}

	const keys = $derived(buildKeys(musicState.pianoStartOctave));
	const whiteKeys = $derived(keys.filter((k) => !k.isBlack));
	const blackKeys = $derived(keys.filter((k) => k.isBlack));

	// Get highlighted notes from pressed keys
	const highlightedNotes = $derived(musicState.getHighlightedPianoNotes());

	function getNoteInfo(key: KeyInfo): { inMajorScale: boolean; color: string } {
		const majorDegree = musicState.getMajorDegree(key.note);
		const inMajorScale = majorDegree !== null;
		const color = FormatUtil.getDegreeColor(majorDegree, '#4b5563');
		return { inMajorScale, color };
	}

	function getChordInterval(noteName: string, noteOctave: number): string | null {
		if (!musicState.selectedChord) return null;
		const chordSymbol = FormatUtil.unformatNote(musicState.selectedChord);
		const chord = Chord.get(chordSymbol);
		if (chord.empty) return null;

		const chordNotes = chord.notes;
		const inversion = musicState.selectedInversion;
		const baseOctave = musicState.chordDisplayOctave;

		// Reorder notes based on inversion
		const invertedNotes = [
			...chordNotes.slice(inversion),
			...chordNotes.slice(0, inversion)
		];
		const bassNote = invertedNotes[0];
		const bassChroma = Note.chroma(bassNote);

		// Check if this note is in the chord
		const noteChroma = Note.chroma(noteName);
		const noteIndex = invertedNotes.findIndex((n) => Note.chroma(n) === noteChroma);
		if (noteIndex === -1) return null;

		// Determine expected octave for this chord note
		if (bassChroma === undefined || noteChroma === undefined) return null;

		// Place bass note closest to the base octave's C
		// If chroma > 6 (F# to B), place in octave below (closer to C going down)
		// If chroma <= 6 (C to F), place in base octave (closer to C going up)
		const bassOctave = bassChroma > 6 ? baseOctave - 1 : baseOctave;

		// Notes with chroma < bass go up an octave (voiced above bass)
		const expectedOctave = noteChroma < bassChroma ? bassOctave + 1 : bassOctave;

		// Only show if this key matches the expected octave
		if (noteOctave !== expectedOctave) return null;

		// Calculate interval from bass note to this note
		const semitones = (noteChroma - bassChroma + 12) % 12;

		return FormatUtil.formatFiguredBassInterval(semitones);
	}

	// Mouse handlers for click/drag interaction
	function handlePianoKeyMouseDown(key: KeyInfo) {
		isDragging = true;
		directPressedNote = { note: key.note, octave: key.octave };
		playNote(key.note, key.octave);
	}

	function handlePianoKeyMouseEnter(key: KeyInfo) {
		if (isDragging) {
			// Stop previous note before playing new one (glissando)
			if (directPressedNote) {
				stopNote(directPressedNote.note, directPressedNote.octave);
			}
			directPressedNote = { note: key.note, octave: key.octave };
			playNote(key.note, key.octave);
		}
	}

	function handleMouseUp() {
		isDragging = false;
		if (directPressedNote) {
			stopNote(directPressedNote.note, directPressedNote.octave);
		}
		directPressedNote = null;
		stopAllNotes();
	}

	// Check if a piano key should be highlighted (from musicState OR direct press)
	function isKeyHighlightedOrPressed(key: KeyInfo): boolean {
		// Direct press on this piano component
		if (directPressedNote) {
			if (Note.chroma(directPressedNote.note) === Note.chroma(key.note) &&
				directPressedNote.octave === key.octave) {
				return true;
			}
		}
		// Highlights from musicState (keyboard, circle of fifths, etc.)
		return highlightedNotes.some(
			(hn) => Note.chroma(hn.note) === Note.chroma(key.note) && hn.octave === key.octave
		);
	}
</script>

{#snippet keyLabel(key: KeyInfo, isBlack: boolean)}
	{@const info = getNoteInfo(key)}
	{@const interval = getChordInterval(key.note, key.octave)}
	{@const labelRadius = isBlack ? blackKey.labelRadius : whiteKey.labelRadius}
	{@const labelX = key.x + (isBlack ? blackKey.width : whiteKey.width) / 2}
	{@const labelY = isBlack ? blackKey.height - 10 : whiteKey.height - 18}
	{@const fontSize = isBlack ? 9 : 11}
	{@const textColor = isBlack ? '#e5e7eb' : '#374151'}
	{@const intervalOffset = isBlack ? labelRadius + 6 : labelRadius + 8}

	{#if info.inMajorScale}
		<circle
			cx={labelX}
			cy={labelY}
			r={labelRadius}
			fill={info.color}
			class="pointer-events-none"
		/>
	{/if}
	{#if interval}
		<text
			x={labelX}
			y={info.inMajorScale ? labelY - intervalOffset : labelY}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={fontSize}
			fill={textColor}
			class="font-music pointer-events-none"
		>
			{interval}
		</text>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
	viewBox="0 0 {svgWidth} {svgHeight}"
	class="w-full"
	preserveAspectRatio="xMidYMax meet"
	onmouseup={handleMouseUp}
	onmouseleave={handleMouseUp}
	role="application"
	aria-label="Piano keyboard - click and drag to play notes"
>
	<!-- Clip path to crop top of keys -->
	<defs>
		<clipPath id="keyboard-clip">
			<rect x="0" y="0" width={svgWidth} height={whiteKey.height} />
		</clipPath>
	</defs>

	<!-- Background matching CircleOfFifths -->
	<rect x="0" y="0" width={svgWidth} height={octaveLabelHeight} fill="#111827" />

	<!-- Octave labels above keyboard -->
	{#each whiteKeys as key}
		{#if key.note === 'C'}
			<text
				x={key.x + whiteKey.width / 2}
				y={octaveLabelHeight / 2}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="8"
				fill="#9ca3af"
				class="font-music pointer-events-none"
			>
				C{key.octave}
			</text>
		{/if}
	{/each}

	<g clip-path="url(#keyboard-clip)" transform="translate(0, {octaveLabelHeight})">
		<!-- White keys -->
		{#each whiteKeys as key}
			{@const highlighted = isKeyHighlightedOrPressed(key)}
			{@const keyCenterX = key.x + whiteKey.width / 2}
			<g
				class="piano-key-group"
				class:highlighted
				style:--key-center-x="{keyCenterX}px"
				style:transform-origin="{keyCenterX}px 0"
			>
				<rect
					x={key.x + whiteKey.gap / 2}
					y={-whiteKey.radius}
					width={whiteKey.width - whiteKey.gap}
					height={whiteKey.height + whiteKey.radius}
					rx={whiteKey.radius}
					ry={whiteKey.radius}
					fill={highlighted ? '#d1d5db' : '#ffffff'}
					class="cursor-pointer piano-key white-piano-key"
					role="button"
					tabindex="0"
					aria-label="{key.note}{key.octave}"
					onmousedown={() => handlePianoKeyMouseDown(key)}
					onmouseenter={() => handlePianoKeyMouseEnter(key)}
				/>
				{@render keyLabel(key, false)}
			</g>
		{/each}

		<!-- Black keys (on top) -->
		{#each blackKeys as key}
			{@const highlighted = isKeyHighlightedOrPressed(key)}
			{@const keyCenterX = key.x + blackKey.width / 2}
			<g
				class="piano-key-group"
				class:highlighted
				style:--key-center-x="{keyCenterX}px"
				style:transform-origin="{keyCenterX}px 0"
			>
				<rect
					x={key.x}
					y={-blackKey.radius}
					width={blackKey.width}
					height={blackKey.height + blackKey.radius}
					rx={blackKey.radius}
					ry={blackKey.radius}
					fill={highlighted ? '#374151' : '#1f2937'}
					class="cursor-pointer piano-key black-piano-key"
					role="button"
					tabindex="0"
					aria-label="{key.note}{key.octave}"
					onmousedown={() => handlePianoKeyMouseDown(key)}
					onmouseenter={() => handlePianoKeyMouseEnter(key)}
				/>
				{@render keyLabel(key, true)}
			</g>
		{/each}
	</g>

	<!-- Thin border on top of keys to cover zoom artifacts -->
	<rect x="0" y={octaveLabelHeight} width={svgWidth} height="1" fill="#111827" />
</svg>

<style>
	.piano-key-group {
		transition: transform 0.08s ease;
	}

	.piano-key {
		transition: fill 0.08s ease;
	}

	.piano-key:hover {
		filter: brightness(0.95);
	}

	/* White key pressed animation - scale down and translate up so top stays fixed */
	.piano-key-group.highlighted:has(.white-piano-key) {
		transform: scale(0.97) translateY(-2px);
	}

	/* Black key pressed animation */
	.piano-key-group.highlighted:has(.black-piano-key) {
		transform: scale(0.95) translateY(-1.6px);
	}

	.piano-key-group.highlighted .piano-key {
		filter: brightness(0.85);
	}
</style>
