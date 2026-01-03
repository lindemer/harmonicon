<script lang="ts">
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';

	// Track modifier key states
	let shiftPressed = $state(false);
	let altPressed = $state(false);

	// Derived inversion level based on modifiers
	let inversion = $derived(shiftPressed ? 2 : altPressed ? 1 : 0);

	// Figured bass annotations for inversions
	const inversionAnnotation = $derived(inversion === 1 ? '⁶' : inversion === 2 ? '⁶₄' : '');

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
	const actionMap: Record<string, string> = {
		Z: 'oct−',
		X: 'oct+'
	};

	// Handle keydown/keyup for modifier tracking
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Shift') shiftPressed = true;
		if (e.key === 'Alt') altPressed = true;
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
					style:background-color={degree ? FormatUtil.getDegreeColor(degree) : undefined}
				>
					<span class="key-label">{key}</span>
					{#if degree}
						<span class="key-function font-music">{getRomanNumeral(degree)}{inversionAnnotation}</span>
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
				<span class="key-function">2nd</span>
			</div>

			{#each bottomRow as key}
				{@const action = actionMap[key]}
				<div class="key action-key">
					<span class="key-label">{key}</span>
					{#if action}
						<span class="key-function">{action}</span>
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
				<span class="key-function">1st</span>
			</div>
			<div class="key modifier-key">
				<span class="key-label">⌘</span>
			</div>
			<div class="key space-key">
				<span class="key-label"></span>
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
		margin-left: calc(-4 * 60px - 38px);
	}

	.key {
		min-width: 56px;
		height: 56px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #374151;
		border-radius: 6px;
		padding: 4px 6px;
		gap: 3px;
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
		height: 112px;
		width: calc(10 * 60px);
	}

	/* White keys - tall piano-style */
	.white-key {
		position: absolute;
		left: calc(var(--key-index) * 60px);
		width: 56px;
		height: 112px;
		display: flex;
		flex-direction: column;
		border-radius: 6px;
		overflow: hidden;
	}

	.white-key-top {
		flex: 1;
		background: #4b5563;
		border-radius: 6px 6px 0 0;
	}

	.white-key-bottom {
		height: 56px;
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
		font-size: 14px;
	}

	/* Black keys - square, positioned between white keys */
	.black-key {
		position: absolute;
		left: calc(var(--key-index) * 60px - 23px);
		width: 56px;
		height: 56px;
		background: #1f2937;
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		z-index: 1;
	}

	.black-key .key-label {
		color: #6b7280;
	}

	.black-key .key-function {
		color: #9ca3af;
		font-size: 12px;
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
		font-size: 9px;
	}

	/* Modifier keys */
	.modifier-key {
		background: #1f2937;
	}

	.modifier-key .key-function {
		color: #9ca3af;
		font-size: 9px;
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
		min-width: 84px;
	}

	.space-key {
		min-width: 280px;
		background: #374151;
	}

	.bottom-row {
		justify-content: flex-start;
		padding-left: 20px;
	}
</style>
