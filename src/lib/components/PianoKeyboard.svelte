<script lang="ts">
	import { musicState } from '$lib/stores/music.svelte';

	// White keys in order
	const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
	// Black keys pattern: which white key indices have a black key after them
	// C#, D#, (skip E), F#, G#, A#, (skip B)
	const blackKeyAfter = [0, 1, 3, 4, 5]; // indices of C, D, F, G, A

	const whiteKeyWidth = 40;
	const whiteKeyHeight = 150;
	const blackKeyWidth = 24;
	const blackKeyHeight = 90;
	const octaves = 2;
	const startOctave = 4;
	const labelCircleRadius = 10;

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
					label: blackNote.replace('#', '♯')
				});
			});
		}

		return keys;
	}

	const keys = buildKeys();
	const whiteKeys = keys.filter((k) => !k.isBlack);
	const blackKeys = keys.filter((k) => k.isBlack);

	// Get degree and color for a note
	// Color is ALWAYS based on major key degree (stays consistent when toggling modes)
	// Roman numeral and visibility are based on current mode's diatonic notes
	function getNoteInfo(key: KeyInfo): { isDiatonic: boolean; color: string; roman: string } {
		const majorDegree = musicState.getMajorDegree(key.note);
		const isDiatonic = musicState.getNoteDegree(key.note) !== null;
		const roman = musicState.getNoteRomanNumeral(key.note) ?? '';
		const color = majorDegree ? `var(--degree-${majorDegree})` : '#4b5563'; // gray-600 for chromatic
		return { isDiatonic, color, roman };
	}
</script>

<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full max-w-2xl">
	<!-- White keys -->
	{#each whiteKeys as key}
		{@const info = getNoteInfo(key)}
		{@const labelX = key.x + whiteKeyWidth / 2}
		{@const labelY = whiteKeyHeight - 14}
		<rect
			x={key.x}
			y={0}
			width={whiteKeyWidth}
			height={whiteKeyHeight}
			fill="#ffffff"
			stroke="#374151"
			stroke-width="1"
			class="cursor-pointer hover:brightness-95"
			role="button"
			tabindex="0"
			aria-label="{key.note}{key.octave}"
		/>
		<!-- Label with colored circle background (only for diatonic notes) -->
		{#if info.isDiatonic}
			<circle
				cx={labelX}
				cy={labelY}
				r={labelCircleRadius}
				fill={info.color}
				class="pointer-events-none"
			/>
			<text
				x={labelX}
				y={labelY}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="10"
				fill="#1f2937"
				class="pointer-events-none"
			>
				{info.roman}
			</text>
		{/if}
	{/each}

	<!-- Black keys (on top) -->
	{#each blackKeys as key}
		{@const info = getNoteInfo(key)}
		{@const labelX = key.x + blackKeyWidth / 2}
		{@const labelY = blackKeyHeight - 14}
		<rect
			x={key.x}
			y={0}
			width={blackKeyWidth}
			height={blackKeyHeight}
			fill="#1f2937"
			stroke="#111827"
			stroke-width="1"
			class="cursor-pointer hover:brightness-125"
			role="button"
			tabindex="0"
			aria-label="{key.note}{key.octave}"
		/>
		<!-- Label with colored circle background (only for diatonic notes) -->
		{#if info.isDiatonic}
			<circle
				cx={labelX}
				cy={labelY}
				r={labelCircleRadius - 1}
				fill={info.color}
				class="pointer-events-none"
			/>
			<text
				x={labelX}
				y={labelY}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="8"
				fill="#1f2937"
				class="pointer-events-none"
			>
				{info.roman}
			</text>
		{/if}
	{/each}
</svg>
