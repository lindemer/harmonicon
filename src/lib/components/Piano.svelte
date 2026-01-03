<script lang="ts">
	import { Chord, Note } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';

	// White keys in order
	const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
	// Black keys pattern: which white key indices have a black key after them
	// C#, D#, (skip E), F#, G#, A#, (skip B)
	const blackKeyAfter = [0, 1, 3, 4, 5]; // indices of C, D, F, G, A

	const whiteKeyWidth = 24;
	const whiteKeyGap = 1;
	const whiteKeyHeight = 120;
	const blackKeyWidth = 16;
	const blackKeyHeight = 72;
	// 61 keys: 5 octaves + final C (e.g., C2 to C7)
	const octaves = 5;
	const whiteLabelRadius = 10;
	const blackLabelRadius = 7;
	const whiteKeyRadius = 3;
	const blackKeyRadius = 3;
	const octaveLabelHeight = 16;

	// 36 white keys: 5 octaves × 7 + 1 (C7)
	const totalWhiteKeys = whiteNotes.length * octaves + 1;
	const svgWidth = totalWhiteKeys * whiteKeyWidth;
	const svgHeight = whiteKeyHeight + octaveLabelHeight;

	type KeyInfo = {
		note: string;
		octave: number;
		isBlack: boolean;
		x: number;
		label: string;
	};

	// Build all keys
	function buildKeys(startOctave: number): KeyInfo[] {
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
		// Add the final C (e.g., C7) white key
		keys.push({
			note: 'C',
			octave: startOctave + octaves,
			isBlack: false,
			x: octaves * 7 * whiteKeyWidth,
			label: 'C'
		});

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
					label: FormatUtil.formatNote(blackNote)
				});
			});
		}

		return keys;
	}

	const keys = $derived(buildKeys(musicState.pianoStartOctave));
	const whiteKeys = $derived(keys.filter((k) => !k.isBlack));
	const blackKeys = $derived(keys.filter((k) => k.isBlack));

	// Get degree and color for a note
	// Color and circle visibility are based on major key degree (stays consistent)
	function getNoteInfo(key: KeyInfo): { inMajorScale: boolean; color: string } {
		const majorDegree = musicState.getMajorDegree(key.note);
		const inMajorScale = majorDegree !== null;
		const color = FormatUtil.getDegreeColor(majorDegree, '#4b5563'); // gray-600 for chromatic
		return { inMajorScale, color };
	}

	function getChordInterval(noteName: string, noteOctave: number): string | null {
		if (!musicState.selectedChord) return null;
		// Convert formatted chord (F♯, B♭°) to Tonal notation (F#, Bbdim)
		const chordSymbol = FormatUtil.unformatNote(musicState.selectedChord);
		const chord = Chord.get(chordSymbol);
		if (chord.empty) return null;

		const chordNotes = chord.notes; // e.g., ['C', 'E', 'G'] for C major
		const inversion = musicState.selectedInversion;
		const baseOctave = musicState.chordDisplayOctave;

		// Reorder notes based on inversion
		// 0: [C, E, G] -> bass=C
		// 1: [E, G, C] -> bass=E
		// 2: [G, C, E] -> bass=G
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
		// Bass note is in baseOctave, notes with lower chroma wrap to next octave
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

<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full" preserveAspectRatio="xMidYMax meet">
	<!-- Clip path to crop top of keys (hides top rounded corners) -->
	<defs>
		<clipPath id="keyboard-clip">
			<rect x="0" y="0" width={svgWidth} height={whiteKeyHeight} />
		</clipPath>
	</defs>

	<!-- Background matching CircleOfFifths -->
	<rect x="0" y="0" width={svgWidth} height={octaveLabelHeight} fill="#111827" />

	<!-- Octave labels above keyboard -->
	{#each whiteKeys as key}
		{#if key.note === 'C'}
			<text
				x={key.x + whiteKeyWidth / 2}
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
		{@const info = getNoteInfo(key)}
		{@const interval = getChordInterval(key.note, key.octave)}
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
		{/if}
		{#if interval}
			<!-- Interval: above circle if in scale, at circle position if not -->
			<text
				x={labelX}
				y={info.inMajorScale ? labelY - whiteLabelRadius - 8 : labelY}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="11"
				fill="#374151"
				class="font-music pointer-events-none"
			>
				{interval}
			</text>
		{/if}
	{/each}

	<!-- Black keys (on top) -->
	{#each blackKeys as key}
		{@const info = getNoteInfo(key)}
		{@const interval = getChordInterval(key.note, key.octave)}
		{@const labelX = key.x + blackKeyWidth / 2}
		{@const labelY = blackKeyHeight - 10}
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
		{/if}
		{#if interval}
			<!-- Interval: above circle if in scale, at circle position if not -->
			<text
				x={labelX}
				y={info.inMajorScale ? labelY - blackLabelRadius - 6 : labelY}
				text-anchor="middle"
				dominant-baseline="middle"
				font-size="9"
				fill="#e5e7eb"
				class="font-music pointer-events-none"
			>
				{interval}
			</text>
		{/if}
	{/each}
	</g>

	<!-- Thin border on top of keys to cover zoom artifacts -->
	<rect x="0" y={octaveLabelHeight} width={svgWidth} height="1" fill="#111827" />
</svg>
