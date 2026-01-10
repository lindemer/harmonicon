<script lang="ts">
	import { Note } from 'tonal';
	import { appState } from '$lib/stores/app.svelte';
	import { FormatUtil } from '$lib/utils/format.util';

	const PIANO_DIMENSIONS = {
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
		octaves: 5,
		octaveLabelHeight: 16
	};

	const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
	const BLACK_KEY_POSITIONS = [0, 1, 3, 4, 5] as const;

	const { whiteKey, blackKey, octaves, octaveLabelHeight } = PIANO_DIMENSIONS;
	const totalWhiteKeys = WHITE_NOTES.length * octaves + 1;
	const svgWidth = totalWhiteKeys * whiteKey.width;
	const svgHeight = whiteKey.height + octaveLabelHeight;

	// Mouse drag state for glissando-style playing
	let isDragging = $state(false);
	let directPressedNote = $state<{ note: string; octave: number } | null>(null);
	let mouseY = $state(0); // Y position relative to keyboard area (for realistic glissando)

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

	const keys = $derived(buildKeys(appState.pianoStartOctave));
	const whiteKeys = $derived(keys.filter((k) => !k.isBlack));
	const blackKeys = $derived(keys.filter((k) => k.isBlack));

	// Get highlighted notes from pressed keys
	const highlightedNotes = $derived(appState.getHighlightedPianoNotes());

	function getNoteInfo(key: KeyInfo): { inMajorScale: boolean; color: string } {
		const majorDegree = FormatUtil.getNoteDegreeInMajorKey(key.note, appState.selectedRoot);
		const inMajorScale = majorDegree !== null;
		const color = FormatUtil.getDegreeColor(majorDegree, '#4b5563');
		return { inMajorScale, color };
	}

	// Find the lowest pressed note for interval calculations
	const lowestPressedNote = $derived.by(() => {
		if (highlightedNotes.length === 0) return null;
		return highlightedNotes.reduce((lowest, note) => {
			const lowestMidi = lowest.octave * 12 + (Note.chroma(lowest.note) ?? 0);
			const noteMidi = note.octave * 12 + (Note.chroma(note.note) ?? 0);
			return noteMidi < lowestMidi ? note : lowest;
		});
	});

	function getChordInterval(noteName: string, noteOctave: number): string | null {
		if (highlightedNotes.length === 0 || !lowestPressedNote) return null;

		// Check if this piano key matches any highlighted note
		const noteChroma = Note.chroma(noteName);
		const matchedNote = highlightedNotes.find(
			(vn) => Note.chroma(vn.note) === noteChroma && vn.octave === noteOctave
		);
		if (!matchedNote) return null;

		// Calculate interval from lowest pressed note to this note
		const bassChroma = Note.chroma(lowestPressedNote.note);
		if (bassChroma === undefined || noteChroma === undefined) return null;

		const semitones = (noteChroma - bassChroma + 12) % 12;
		return FormatUtil.formatFiguredBassInterval(semitones);
	}

	// Mouse handlers for click/drag interaction
	function handlePianoKeyMouseDown(key: KeyInfo) {
		isDragging = true;
		directPressedNote = { note: key.note, octave: key.octave };
		appState.addPressedNote(key.note, key.octave);
	}

	function handlePianoKeyMouseEnter(key: KeyInfo) {
		if (isDragging) {
			// During glissando, white keys only trigger below black key level (realistic piano behavior)
			if (!key.isBlack && mouseY <= blackKey.height) {
				return;
			}
			// Stop previous note before playing new one (glissando)
			if (directPressedNote) {
				appState.removePressedNote(directPressedNote.note, directPressedNote.octave);
			}
			directPressedNote = { note: key.note, octave: key.octave };
			appState.addPressedNote(key.note, key.octave);
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		const svg = e.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const svgY = ((e.clientY - rect.top) / rect.height) * svgHeight;
		const newMouseY = svgY - octaveLabelHeight; // Y relative to keyboard area

		// Check if we crossed the black key threshold
		const wasInBlackZone = mouseY <= blackKey.height;
		const nowInBlackZone = newMouseY <= blackKey.height;
		mouseY = newMouseY;

		// If we crossed zones vertically, trigger the appropriate key under the cursor
		if (wasInBlackZone !== nowInBlackZone) {
			const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
			const keyUnderCursor = findKeyAtPosition(mouseX, newMouseY);
			if (keyUnderCursor && keyUnderCursor !== directPressedNote) {
				// Only trigger if the key matches the zone we're now in
				const shouldTrigger = keyUnderCursor.isBlack ? nowInBlackZone : !nowInBlackZone;
				if (shouldTrigger) {
					if (directPressedNote) {
						appState.removePressedNote(directPressedNote.note, directPressedNote.octave);
					}
					directPressedNote = { note: keyUnderCursor.note, octave: keyUnderCursor.octave };
					appState.addPressedNote(keyUnderCursor.note, keyUnderCursor.octave);
				}
			}
		}
	}

	function findKeyAtPosition(x: number, y: number): KeyInfo | null {
		// Check black keys first (they're on top)
		if (y <= blackKey.height) {
			for (const key of blackKeys) {
				if (x >= key.x && x <= key.x + blackKey.width) {
					return key;
				}
			}
		}
		// Check white keys
		for (const key of whiteKeys) {
			if (x >= key.x && x <= key.x + whiteKey.width) {
				return key;
			}
		}
		return null;
	}

	function handleMouseUp() {
		isDragging = false;
		if (directPressedNote) {
			appState.removePressedNote(directPressedNote.note, directPressedNote.octave);
		}
		directPressedNote = null;
	}

	// Check if a piano key should be highlighted (from appState OR direct press)
	function isKeyHighlightedOrPressed(key: KeyInfo): boolean {
		// Direct press on this piano component
		if (directPressedNote) {
			if (
				Note.chroma(directPressedNote.note) === Note.chroma(key.note) &&
				directPressedNote.octave === key.octave
			) {
				return true;
			}
		}
		// Highlights from appState (keyboard, circle of fifths, etc.)
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
		<circle cx={labelX} cy={labelY} r={labelRadius} fill={info.color} class="pointer-events-none" />
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
	onmousemove={handleMouseMove}
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
	{#each whiteKeys as key (`${key.note}${key.octave}`)}
		{#if key.note === 'C'}
			<text
				x={key.x + whiteKey.width / 2}
				y={octaveLabelHeight / 2}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="8"
				fill={key.octave === appState.chordDisplayOctave ? '#f59e0b' : '#9ca3af'}
				class="font-music pointer-events-none"
			>
				C{key.octave}
			</text>
		{/if}
	{/each}

	<g clip-path="url(#keyboard-clip)" transform="translate(0, {octaveLabelHeight})">
		<!-- White keys -->
		{#each whiteKeys as key (`${key.note}${key.octave}`)}
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
					class="piano-key white-piano-key cursor-pointer"
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
		{#each blackKeys as key (`${key.note}${key.octave}`)}
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
					class="piano-key black-piano-key cursor-pointer"
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
		outline: none;
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
