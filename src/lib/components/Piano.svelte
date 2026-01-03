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

	const { whiteKey, blackKey, octaves, octaveLabelHeight } = PIANO_DIMENSIONS;
	const { width: svgWidth, height: svgHeight } = PIANO_SVG;

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

	// Check if a piano key should be highlighted
	function isKeyHighlighted(key: KeyInfo): boolean {
		return highlightedNotes.some(
			(hn) => Note.chroma(hn.note) === Note.chroma(key.note) && hn.octave === key.octave
		);
	}

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
		let expectedOctave = baseOctave;
		if (noteChroma < bassChroma) {
			expectedOctave = baseOctave + 1;
		}

		// Only show if this key matches the expected octave
		if (noteOctave !== expectedOctave) return null;

		// Calculate interval from bass note to this note
		const semitones = (noteChroma - bassChroma + 12) % 12;

		return FormatUtil.formatFiguredBassInterval(semitones);
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

<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full" preserveAspectRatio="xMidYMax meet">
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
			{@const highlighted = isKeyHighlighted(key)}
			<rect
				x={key.x + whiteKey.gap / 2}
				y={-whiteKey.radius}
				width={whiteKey.width - whiteKey.gap}
				height={whiteKey.height + whiteKey.radius}
				rx={whiteKey.radius}
				ry={whiteKey.radius}
				fill={highlighted ? '#fbbf24' : '#ffffff'}
				class="cursor-pointer piano-key"
				class:highlighted
				role="button"
				tabindex="0"
				aria-label="{key.note}{key.octave}"
			/>
			{@render keyLabel(key, false)}
		{/each}

		<!-- Black keys (on top) -->
		{#each blackKeys as key}
			{@const highlighted = isKeyHighlighted(key)}
			<rect
				x={key.x}
				y={-blackKey.radius}
				width={blackKey.width}
				height={blackKey.height + blackKey.radius}
				rx={blackKey.radius}
				ry={blackKey.radius}
				fill={highlighted ? '#f59e0b' : '#1f2937'}
				class="cursor-pointer piano-key"
				class:highlighted
				role="button"
				tabindex="0"
				aria-label="{key.note}{key.octave}"
			/>
			{@render keyLabel(key, true)}
		{/each}
	</g>

	<!-- Thin border on top of keys to cover zoom artifacts -->
	<rect x="0" y={octaveLabelHeight} width={svgWidth} height="1" fill="#111827" />
</svg>

<style>
	.piano-key {
		transition: fill 0.08s ease;
	}

	.piano-key:hover:not(.highlighted) {
		filter: brightness(0.95);
	}

	.piano-key.highlighted {
		filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
	}
</style>
