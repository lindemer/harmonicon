<script lang="ts">
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';
	import RomanNumeral from './RomanNumeral.svelte';

	// Get color for a degree key, accounting for inversion
	// When inverted, the color reflects the bass note's degree instead
	function getDegreeColorForInversion(degree: number, inv: 0 | 1 | 2): string {
		if (inv === 0) {
			return FormatUtil.getDegreeColor(degree);
		}
		const chord = musicState.getChordForDegree(degree);
		if (!chord || !chord.notes.length) {
			return FormatUtil.getDegreeColor(degree);
		}
		const bassNote = chord.notes[inv] ?? chord.notes[0];
		const bassDegree = musicState.getMajorDegree(bassNote);
		return FormatUtil.getDegreeColor(bassDegree ?? degree);
	}

	// Track modifier key states
	let shiftPressed = $state(false);
	let altPressed = $state(false);

	// Derived inversion level based on modifiers
	// Alt = 1st inversion, Alt+Shift = 2nd inversion (shift alone does nothing)
	let inversion: 0 | 1 | 2 = $derived(altPressed && shiftPressed ? 2 : altPressed ? 1 : 0);

	// Number row for chord degrees
	const numberRow = ['1', '2', '3', '4', '5', '6', '7'];

	// Piano keys layout - matches Logic Pro Musical Typing
	// White keys on home row, black keys on top row (Q, R, I removed - no black key there)
	const pianoKeys = [
		{ white: 'A', black: null, note: 'C' },
		{ white: 'S', black: 'W', note: 'D' },
		{ white: 'D', black: 'E', note: 'E' },
		{ white: 'F', black: null, note: 'F' },
		{ white: 'G', black: 'T', note: 'G' },
		{ white: 'H', black: 'Y', note: 'A' },
		{ white: 'J', black: 'U', note: 'B' },
		{ white: 'K', black: null, note: 'C' },
		{ white: 'L', black: 'O', note: 'D' },
		{ white: ';', black: 'P', note: 'E' }
	];

	// Bottom row actions
	const bottomRow = ['Z', 'X'];
	const actionMap: Record<string, { text: string; sup: string }> = {
		Z: { text: '8', sup: 'vb' },
		X: { text: '8', sup: 'va' }
	};

	// Handle keydown/keyup for modifier tracking and spacebar toggle
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Shift') shiftPressed = true;
		if (e.key === 'Alt') altPressed = true;
		if (e.key === ' ') {
			e.preventDefault();
			musicState.toggleMode();
		}
		if (e.key === 'z' || e.key === 'Z') {
			musicState.decrementChordOctave();
		}
		if (e.key === 'x' || e.key === 'X') {
			musicState.incrementChordOctave();
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		if (e.key === 'Shift') shiftPressed = false;
		if (e.key === 'Alt') altPressed = false;
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
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<div class="keyboard-container">
	<div class="keyboard">
		<!-- Number row -->
		<div class="row number-row">
			{#each numberRow as key}
				{@const degree = getDegree(key)}
				<div
					class="key degree-key"
					style:background-color={degree ? getDegreeColorForInversion(degree, inversion) : undefined}
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
				<!-- White key (tall, extends from home row up) -->
				<div class="white-key" style:--key-index={i}>
					<div class="white-key-top"></div>
					<div class="white-key-bottom">
						<span class="key-label">{pk.white}</span>
						<span class="key-function font-music">{pk.note}</span>
					</div>
				</div>
				<!-- Black key (if present) -->
				{#if pk.black}
					<div class="black-key" style:--key-index={i}>
						<span class="key-label">{pk.black}</span>
						<span class="key-function font-music">{pk.note}♯</span>
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
				<div class="key action-key">
					<span class="key-label">{key}</span>
					{#if action}
						<span class="key-function font-music">{action.text}<sup>{action.sup}</sup></span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Modifier row -->
		<div class="row">
			<div class="key modifier-key">
				<span class="key-label">ctrl</span>
			</div>
			<div class="key modifier-key" class:pressed={altPressed}>
				<span class="key-label">⌥</span>
				<span class="key-function font-music">1<sup>st</sup></span>
			</div>
			<div class="key modifier-key">
				<span class="key-label">⌘</span>
			</div>
			<div
				class="key space-key"
				onclick={() => musicState.toggleMode()}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); musicState.toggleMode(); } }}
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
		transition: filter 0.1s ease;
	}

	.key:hover {
		filter: brightness(1.15);
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
		transition: filter 0.1s ease;
	}

	.white-key:hover {
		filter: brightness(1.15);
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
		transition: filter 0.1s ease;
	}

	.black-key:hover {
		filter: brightness(1.25);
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

	/* Action keys (Z, X for octave) */
	.action-key {
		background: #4b5563;
	}

	.action-key .key-function {
		color: #fbbf24;
	}

	/* Modifier keys */
	.modifier-key {
		background: #1f2937;
	}

	.modifier-key .key-function {
		color: #9ca3af;
	}

	.modifier-key.pressed {
		background: #4b5563;
	}

	.modifier-key.pressed .key-label,
	.modifier-key.pressed .key-function {
		color: #fbbf24;
	}

	/* Wide keys */
	.wide-key {
		min-width: 96px;
	}

	.space-key {
		min-width: 320px;
		background: #374151;
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
