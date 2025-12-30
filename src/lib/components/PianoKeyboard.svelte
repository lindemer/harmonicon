<script lang="ts">
	import { Chord, Note } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { formatNote, unformatNote, getDegreeColor } from '$lib/utils/format';

	// White keys in order
	const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
	// Black keys pattern: which white key indices have a black key after them
	// C#, D#, (skip E), F#, G#, A#, (skip B)
	const blackKeyAfter = [0, 1, 3, 4, 5]; // indices of C, D, F, G, A

	const whiteKeyWidth = 36;
	const whiteKeyGap = 1;
	const whiteKeyHeight = 150;
	const blackKeyWidth = 24;
	const blackKeyHeight = 90;
	const octaves = 2;
	const startOctave = 4;
	const whiteLabelRadius = 12;
	const blackLabelRadius = 9;
	const whiteKeyRadius = 4;
	const blackKeyRadius = 4;

	const totalWhiteKeys = whiteNotes.length * octaves;
	const svgWidth = totalWhiteKeys * whiteKeyWidth;
	const svgHeight = whiteKeyHeight;

	type KeyInfo = {
		note: string;
		octave: number;
		isBlack: boolean;
		x: number;
		label: string;
	};

	// Build all keys
	function buildKeys(): KeyInfo[] {
		const keys: KeyInfo[] = [];

		// White keys first (rendered below black keys)
		for (let oct = 0; oct < octaves; oct++) {
			const octave = startOctave + oct;
			whiteNotes.forEach((note, i) => {
				keys.push({
					note,
					octave,
					isBlack: false,
					x: (oct * 7 + i) * whiteKeyWidth,
					label: note
				});
			});
		}

		// Black keys (rendered on top)
		for (let oct = 0; oct < octaves; oct++) {
			const octave = startOctave + oct;
			blackKeyAfter.forEach((whiteIndex) => {
				const blackNote = whiteNotes[whiteIndex] + '#';
				keys.push({
					note: blackNote,
					octave,
					isBlack: true,
					x: (oct * 7 + whiteIndex) * whiteKeyWidth + whiteKeyWidth - blackKeyWidth / 2,
					label: formatNote(blackNote)
				});
			});
		}

		return keys;
	}

	const keys = buildKeys();
	const whiteKeys = keys.filter((k) => !k.isBlack);
	const blackKeys = keys.filter((k) => k.isBlack);

	// Get degree and color for a note
	// Color and circle visibility are based on major key degree (stays consistent)
	// Roman numeral is based on current mode's diatonic notes (hidden in 'none' mode)
	function getNoteInfo(key: KeyInfo): { inMajorScale: boolean; color: string; roman: string } {
		const majorDegree = musicState.getMajorDegree(key.note);
		const inMajorScale = majorDegree !== null;
		const roman = musicState.getNoteRomanNumeral(key.note) ?? '';
		const color = getDegreeColor(majorDegree, '#4b5563'); // gray-600 for chromatic
		return { inMajorScale, color, roman };
	}

	function formatInterval(interval: string): string {
		// Tonal uses: 1P, 3m, 3M, 5P, 5d, 7m, 7M, etc.
		// Display as: P1, m3, M3, P5, d5, m7, M7, etc.
		const num = interval.match(/\d+/)?.[0] ?? '';
		const quality = interval.match(/[PmMdA]/)?.[0] ?? '';
		return quality + num;
	}

	function getChordInterval(noteName: string): string | null {
		if (!musicState.selectedChord) return null;
		// Convert formatted chord (F♯, B♭°) to Tonal notation (F#, Bbdim)
		const chordSymbol = unformatNote(musicState.selectedChord);
		const chord = Chord.get(chordSymbol);
		if (chord.empty) return null;

		const noteChroma = Note.chroma(noteName);
		const chordNotes = chord.notes;

		// Find matching note in chord by chroma (handles enharmonics)
		for (let i = 0; i < chordNotes.length; i++) {
			if (Note.chroma(chordNotes[i]) === noteChroma) {
				return formatInterval(chord.intervals[i]);
			}
		}
		return null;
	}
</script>

<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full max-w-2xl">
	<!-- Clip path to crop top of keys (hides top rounded corners) -->
	<defs>
		<clipPath id="keyboard-clip">
			<rect x="0" y="0" width={svgWidth} height={svgHeight} />
		</clipPath>
	</defs>

	<g clip-path="url(#keyboard-clip)">
	<!-- White keys -->
	{#each whiteKeys as key}
		{@const info = getNoteInfo(key)}
		{@const interval = getChordInterval(key.note)}
		{@const labelX = key.x + whiteKeyWidth / 2}
		{@const labelY = whiteKeyHeight - 18}
		<rect
			x={key.x + whiteKeyGap / 2}
			y={-whiteKeyRadius}
			width={whiteKeyWidth - whiteKeyGap}
			height={whiteKeyHeight + whiteKeyRadius}
			rx={whiteKeyRadius}
			ry={whiteKeyRadius}
			fill="#ffffff"
			class="cursor-pointer hover:brightness-95"
			role="button"
			tabindex="0"
			aria-label="{key.note}{key.octave}"
		/>
		{#if info.inMajorScale}
			<!-- In major scale: show colored circle -->
			<circle
				cx={labelX}
				cy={labelY}
				r={whiteLabelRadius}
				fill={info.color}
				class="pointer-events-none"
			/>
			{#if info.roman}
				<!-- Show roman numeral above (hidden in 'none' mode) -->
				<text
					x={labelX}
					y={labelY - whiteLabelRadius - 10}
					text-anchor="middle"
					dominant-baseline="middle"
					font-size="14"
					fill="#374151"
					class="font-music pointer-events-none"
				>
					{info.roman}
				</text>
			{/if}
			{#if interval}
				<!-- Interval inside the circle -->
				<text
					x={labelX}
					y={labelY}
					text-anchor="middle"
					dominant-baseline="middle"
					font-size="10"
					fill="#ffffff"
					class="font-music pointer-events-none"
				>
					{interval}
				</text>
			{/if}
		{:else if interval}
			<!-- Non-diatonic chord note: show gray circle with interval -->
			<circle
				cx={labelX}
				cy={labelY}
				r={whiteLabelRadius}
				fill="#4b5563"
				class="pointer-events-none"
			/>
			<text
				x={labelX}
				y={labelY}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="10"
				fill="#ffffff"
				class="font-music pointer-events-none"
			>
				{interval}
			</text>
		{/if}
	{/each}

	<!-- Black keys (on top) -->
	{#each blackKeys as key}
		{@const info = getNoteInfo(key)}
		{@const interval = getChordInterval(key.note)}
		{@const labelX = key.x + blackKeyWidth / 2}
		{@const labelY = blackKeyHeight - 14}
		<rect
			x={key.x}
			y={-blackKeyRadius}
			width={blackKeyWidth}
			height={blackKeyHeight + blackKeyRadius}
			rx={blackKeyRadius}
			ry={blackKeyRadius}
			fill="#1f2937"
			class="cursor-pointer hover:brightness-125"
			role="button"
			tabindex="0"
			aria-label="{key.note}{key.octave}"
		/>
		{#if info.inMajorScale}
			<!-- In major scale: show colored circle -->
			<circle
				cx={labelX}
				cy={labelY}
				r={blackLabelRadius}
				fill={info.color}
				class="pointer-events-none"
			/>
			{#if info.roman}
				<!-- Show roman numeral above (hidden in 'none' mode) -->
				<text
					x={labelX}
					y={labelY - blackLabelRadius - 8}
					text-anchor="middle"
					dominant-baseline="middle"
					font-size="11"
					fill="#e5e7eb"
					class="font-music pointer-events-none"
				>
					{info.roman}
				</text>
			{/if}
			{#if interval}
				<!-- Interval inside the circle -->
				<text
					x={labelX}
					y={labelY}
					text-anchor="middle"
					dominant-baseline="middle"
					font-size="8"
					fill="#ffffff"
					class="font-music pointer-events-none"
				>
					{interval}
				</text>
			{/if}
		{:else if interval}
			<!-- Non-diatonic chord note: show gray circle with interval -->
			<circle
				cx={labelX}
				cy={labelY}
				r={blackLabelRadius}
				fill="#4b5563"
				class="pointer-events-none"
			/>
			<text
				x={labelX}
				y={labelY}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="8"
				fill="#ffffff"
				class="font-music pointer-events-none"
			>
				{interval}
			</text>
		{/if}
	{/each}
	</g>
</svg>
