<script lang="ts">
	import { musicState } from '$lib/stores/music.svelte';

	// SMuFL code points for Bravura (clef and time signature)
	const TREBLE_CLEF = '\uE050';
	const BASS_CLEF = '\uE062';

	// SMuFL accidentals for Bravura
	const SHARP = '\uE262';
	const FLAT = '\uE260';

	// Time signature number glyphs (SMuFL timeSignature range)
	const TIME_SIG_NUMBERS: Record<number, string> = {
		2: '\uE082',
		3: '\uE083',
		4: '\uE084',
		5: '\uE085',
		6: '\uE086',
		7: '\uE087',
		8: '\uE088',
		9: '\uE089',
		12: '\uE081\uE082' // Combine 1 and 2 glyphs
	};

	// Key signature data: number of sharps (positive) or flats (negative)
	const KEY_SIGNATURES: Record<string, number> = {
		C: 0,
		G: 1,
		D: 2,
		A: 3,
		E: 4,
		B: 5,
		'F#': 6,
		Gb: -6,
		Db: -5,
		Ab: -4,
		Eb: -3,
		Bb: -2,
		F: -1
	};

	// Sharp positions on staff (steps from top line, 0=top line, each step = half LINE_SPACING)
	// Treble clef top line = F5, lines at 0,2,4,6,8 (F5,D5,B4,G4,E4), spaces at 1,3,5,7
	// Order of sharps: F C G D A E B
	// Treble: F5(0), C5(3), G5(-1), D5(2), A4(5), E5(1), B4(4)
	const SHARP_POSITIONS_TREBLE = [0, 3, -1, 2, 5, 1, 4];
	// Bass clef top line = A3, lines at 0,2,4,6,8 (A3,F3,D3,B2,G2), spaces at 1,3,5,7
	// Bass: F3(2), C3(5), G3(-1), D3(2), A2(5), E3(1), B2(4) - same pattern, offset by 2
	const SHARP_POSITIONS_BASS = [2, 5, 1, 4, 7, 3, 6];

	// Flat positions on staff
	// Order of flats: B E A D G C F
	// Treble: B4(4), E5(1), A4(5), D5(2), G4(6), C5(3), F4(7)
	const FLAT_POSITIONS_TREBLE = [4, 1, 5, 2, 6, 3, 7];
	// Bass: B2(6), E3(3), A2(7), D3(4), G2(8), C3(5), F2(9)
	const FLAT_POSITIONS_BASS = [6, 3, 7, 4, 8, 5, 9];

	// SVG dimensions
	const SVG_HEIGHT = 70;
	const STAFF_TOP = 15;
	const LINE_SPACING = 10;

	// Staff line positions (5 lines)
	const staffLines = [0, 1, 2, 3, 4].map((i) => STAFF_TOP + i * LINE_SPACING);

	// Layout constants
	const CLEF_X = 8;
	const CLEF_Y_TREBLE = 45;
	const CLEF_Y_BASS = 25;
	const KEY_SIG_START_X = 50;
	const KEY_SIG_SPACING = 7;
	const TIME_SIG_GAP = 18;

	// Hover states
	let clefHovered = $state(false);
	let topNumHovered = $state(false);
	let bottomNumHovered = $state(false);

	// Computed values
	const clefGlyph = $derived(musicState.clef === 'treble' ? TREBLE_CLEF : BASS_CLEF);
	const clefY = $derived(musicState.clef === 'treble' ? CLEF_Y_TREBLE : CLEF_Y_BASS);
	const topNumGlyph = $derived(TIME_SIG_NUMBERS[musicState.timeSignatureTop]);
	const bottomNumGlyph = $derived(TIME_SIG_NUMBERS[musicState.timeSignatureBottom]);

	// Get key signature info
	const keySignatureCount = $derived(KEY_SIGNATURES[musicState.selectedRoot] ?? 0);
	const isSharpKey = $derived(keySignatureCount > 0);
	const accidentalCount = $derived(Math.abs(keySignatureCount));
	const accidentalGlyph = $derived(isSharpKey ? SHARP : FLAT);

	// Get accidental positions based on clef
	const accidentalPositions = $derived(
		musicState.clef === 'treble'
			? isSharpKey
				? SHARP_POSITIONS_TREBLE
				: FLAT_POSITIONS_TREBLE
			: isSharpKey
				? SHARP_POSITIONS_BASS
				: FLAT_POSITIONS_BASS
	);

	// Calculate key signature width for positioning time signature
	const keySigWidth = $derived(accidentalCount > 0 ? accidentalCount * KEY_SIG_SPACING : 0);

	// Dynamic time signature X position (closer to clef when no key signature)
	const timeSigX = $derived(
		accidentalCount > 0 ? KEY_SIG_START_X + keySigWidth + TIME_SIG_GAP : KEY_SIG_START_X
	);

	// Fixed staff width (doesn't change with key signature)
	const STAFF_WIDTH = 130;

	// Calculate SVG width based on content
	const svgWidth = $derived(Math.max(STAFF_WIDTH, timeSigX + 30));

	// Time signature Y positions
	const TIME_SIG_TOP_Y = 20;
	const TIME_SIG_BOTTOM_Y = 40;

	// Convert staff position to Y coordinate
	function positionToY(staffPosition: number): number {
		return STAFF_TOP + staffPosition * (LINE_SPACING / 2) - 1;
	}
</script>

<svg
	viewBox="0 0 {svgWidth} {SVG_HEIGHT}"
	class="h-16 select-none"
	style="width: {svgWidth * 0.9}px;"
	role="application"
	aria-label="Staff notation controls"
>
	<!-- Staff lines (fixed width) -->
	{#each staffLines as y}
		<line x1="0" y1={y} x2={STAFF_WIDTH} y2={y} stroke="#6b7280" stroke-width="1" />
	{/each}

	<!-- Clef (clickable) -->
	<text
		x={CLEF_X}
		y={clefY}
		class="font-bravura cursor-pointer"
		font-size="38"
		font-weight="normal"
		fill={clefHovered ? '#ffffff' : '#d1d5db'}
		tabindex="0"
		onclick={() => musicState.toggleClef()}
		onkeydown={(e) => e.key === 'Enter' && musicState.toggleClef()}
		onmouseenter={() => (clefHovered = true)}
		onmouseleave={() => (clefHovered = false)}
		role="button"
		aria-label="Toggle clef: currently {musicState.clef}"
	>
		{clefGlyph}
	</text>

	<!-- Key signature accidentals -->
	{#each Array(accidentalCount) as _, i}
		{@const yPos = positionToY(accidentalPositions[i])}
		<text
			x={KEY_SIG_START_X + i * KEY_SIG_SPACING}
			y={yPos}
			class="font-bravura"
			font-size="32"
			font-weight="normal"
			fill="#d1d5db"
			dominant-baseline="central"
			text-anchor="middle"
		>
			{accidentalGlyph}
		</text>
	{/each}

	<!-- Time signature top number (clickable) -->
	<g
		class="cursor-pointer"
		tabindex="0"
		onclick={() => musicState.cycleTimeSignatureTop()}
		onkeydown={(e) => e.key === 'Enter' && musicState.cycleTimeSignatureTop()}
		onmouseenter={() => (topNumHovered = true)}
		onmouseleave={() => (topNumHovered = false)}
		role="button"
		aria-label="Time signature top: {musicState.timeSignatureTop}, click to cycle"
	>
		<rect x={timeSigX - 15} y={STAFF_TOP} width="30" height="20" fill="transparent" />
		<text
			x={timeSigX}
			y={TIME_SIG_TOP_Y}
			class="font-bravura pointer-events-none"
			font-size="36"
			font-weight="normal"
			fill={topNumHovered ? '#ffffff' : '#d1d5db'}
			text-anchor="middle"
			dominant-baseline="middle"
		>
			{topNumGlyph}
		</text>
	</g>

	<!-- Time signature bottom number (clickable) -->
	<g
		class="cursor-pointer"
		tabindex="0"
		onclick={() => musicState.cycleTimeSignatureBottom()}
		onkeydown={(e) => e.key === 'Enter' && musicState.cycleTimeSignatureBottom()}
		onmouseenter={() => (bottomNumHovered = true)}
		onmouseleave={() => (bottomNumHovered = false)}
		role="button"
		aria-label="Time signature bottom: {musicState.timeSignatureBottom}, click to toggle"
	>
		<rect x={timeSigX - 15} y={STAFF_TOP + 20} width="30" height="20" fill="transparent" />
		<text
			x={timeSigX}
			y={TIME_SIG_BOTTOM_Y}
			class="font-bravura pointer-events-none"
			font-size="36"
			font-weight="normal"
			fill={bottomNumHovered ? '#ffffff' : '#d1d5db'}
			text-anchor="middle"
			dominant-baseline="middle"
		>
			{bottomNumGlyph}
		</text>
	</g>
</svg>
