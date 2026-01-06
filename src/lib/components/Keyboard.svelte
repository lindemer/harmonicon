<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { FormatUtil } from '$lib/utils/format.util';
	import { VoicingUtil } from '$lib/utils/voicing.util';
	import RomanNumeral from './RomanNumeral.svelte';
	import { keyboardState } from '$lib/stores/keyboard.svelte';

	const kb = keyboardState;

	// Responsive scaling
	let containerWidth = $state(0);
	const KEYBOARD_NATURAL_WIDTH = 750;
	const CONTAINER_PADDING = 32;

	const keyboardScale = $derived(
		containerWidth > 0
			? Math.min(1, (containerWidth - CONTAINER_PADDING) / KEYBOARD_NATURAL_WIDTH)
			: 1
	);

	// Get color for a degree key, accounting for inversion
	// Always uses the bass note's major degree for color - ensures minor mode shows correct colors
	function getDegreeColorForInversion(degree: number, inv: 0 | 1 | 2): string {
		const chord = VoicingUtil.getChordForDegree(degree, appState.selectedRoot, appState.mode);
		if (!chord || !chord.notes.length) {
			return FormatUtil.getDegreeColor(degree);
		}
		const bassNote = chord.notes[inv] ?? chord.notes[0];
		const bassDegree = FormatUtil.getNoteDegreeInMajorKey(bassNote, appState.selectedRoot);
		return FormatUtil.getDegreeColor(bassDegree ?? degree);
	}

	// Get roman numeral for a degree
	function getRomanNumeral(degree: number): string {
		return FormatUtil.getDiatonicRomanNumeral(degree, appState.mode);
	}

	// Get color for a note based on its position in the major scale
	function getNoteColor(noteName: string): string | undefined {
		const degree = FormatUtil.getNoteDegreeInMajorKey(noteName, appState.selectedRoot);
		if (degree === null) return undefined;
		return FormatUtil.getDegreeColor(degree);
	}
</script>

<svelte:window onkeydown={kb.handleKeydown} onkeyup={kb.handleKeyup} onblur={kb.handleBlur} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="keyboard-container"
	bind:clientWidth={containerWidth}
	onmouseup={kb.handleMouseUp}
	onmouseleave={kb.handleMouseUp}
	role="application"
>
	<div
		class="keyboard"
		style:transform="scale({keyboardScale})"
		style:transform-origin="center center"
	>
		<!-- Number row -->
		<div class="row number-row">
			{#each kb.numberRow as key (key)}
				{@const degree = kb.getDegree(key)}
				<div
					class="key degree-key"
					class:pressed={degree !== null && appState.pressedDegree === degree}
					style:background-color={degree
						? getDegreeColorForInversion(degree, kb.inversion)
						: undefined}
					onmousedown={() => degree && kb.handleDegreeMouseDown(degree)}
					onmouseenter={() => degree && kb.handleDegreeMouseEnter(degree)}
					role="button"
					tabindex="0"
				>
					<span class="key-label">{key}</span>
					{#if degree}
						<span class="key-function"
							><RomanNumeral numeral={getRomanNumeral(degree)} inversion={kb.inversion} centered /></span
						>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Piano keys section -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="piano-section" onmousemove={kb.handlePianoSectionMouseMove}>
			{#each kb.pianoKeys as pk, i (pk.white)}
				{@const whiteNoteColor = getNoteColor(pk.note)}
				{@const blackNoteColor = pk.blackNote ? getNoteColor(pk.blackNote) : undefined}
				<!-- White key (tall, extends from home row up) -->
				<div
					class="white-key"
					class:pressed={kb.isKeyPressed(pk.white)}
					style:--key-index={i}
					onmousedown={() => kb.handleNoteMouseDown(pk.white)}
					onmouseenter={() => kb.handleNoteMouseEnter(pk.white, false)}
					role="button"
					tabindex="0"
				>
					<div class="white-key-top"></div>
					<div class="white-key-bottom">
						<span class="key-label">{pk.white}</span>
						<span class="key-function font-music" style:color={whiteNoteColor ?? '#f3f4f6'}
							>{pk.note}</span
						>
					</div>
				</div>
				<!-- Black key (if present) -->
				{#if pk.black && pk.blackNote}
					<div
						class="black-key dark-key"
						class:pressed={kb.isKeyPressed(pk.black)}
						style:--key-index={i}
						onmousedown={() => pk.black && kb.handleNoteMouseDown(pk.black)}
						onmouseenter={() => pk.black && kb.handleNoteMouseEnter(pk.black, true)}
						role="button"
						tabindex="0"
					>
						<span class="key-label">{pk.black}</span>
						<span class="key-function font-music" style:color={blackNoteColor ?? '#f3f4f6'}
							>{FormatUtil.formatNote(pk.blackNote)}</span
						>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Bottom row -->
		<div class="row bottom-row">
			<!-- Shift key -->
			<div
				class="key wide-key dark-key"
				class:pressed={kb.shiftPressed}
				onmousedown={() => (kb.shiftMousePressed = true)}
				onmouseup={() => (kb.shiftMousePressed = false)}
				onmouseleave={() => (kb.shiftMousePressed = false)}
				role="button"
				tabindex="0"
			>
				<span class="key-label">⇧</span>
				<span class="key-function font-music">2<sup>nd</sup></span>
			</div>

			{#each kb.bottomRow as key (key)}
				{@const action = kb.actionMap[key]}
				<div
					class="key dark-key"
					class:pressed={kb.isActionKeyPressed(key)}
					onmousedown={() => {
						kb.clickedActionKey = key;
						if (key === 'Z') appState.decrementChordOctave();
						else appState.incrementChordOctave();
					}}
					onmouseup={() => (kb.clickedActionKey = null)}
					onmouseleave={() => (kb.clickedActionKey = null)}
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
			<div class="key dark-key disabled-key">
				<span class="key-label">ctrl</span>
			</div>
			<div
				class="key dark-key"
				class:pressed={kb.altPressed}
				onmousedown={() => (kb.altMousePressed = true)}
				onmouseup={() => (kb.altMousePressed = false)}
				onmouseleave={() => (kb.altMousePressed = false)}
				role="button"
				tabindex="0"
			>
				<span class="key-label">⌥</span>
				<span class="key-function font-music">1<sup>st</sup></span>
			</div>
			<div class="key dark-key disabled-key">
				<span class="key-label">⌘</span>
			</div>
			<div
				class="key dark-key space-key"
				class:pressed={kb.spacePressed || kb.spaceClicked}
				onmousedown={() => {
					kb.spaceClicked = true;
					appState.toggleMode();
				}}
				onmouseup={() => (kb.spaceClicked = false)}
				onmouseleave={() => (kb.spaceClicked = false)}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						appState.toggleMode();
					}
				}}
				role="button"
				tabindex="0"
			>
				<span class="key-function mode-toggle font-music">
					<span
						class:active-mode={appState.mode === 'major'}
						class:inactive-mode={appState.mode !== 'major'}>Δ</span
					>
					<span class="mode-separator">/</span>
					<span
						class:active-mode={appState.mode === 'minor'}
						class:inactive-mode={appState.mode !== 'minor'}>m</span
					>
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
		--key-size: 64px;
		--key-gap: 4px;
		--key-unit: calc(var(--key-size) + var(--key-gap));
	}

	.keyboard {
		display: flex;
		flex-direction: column;
		gap: var(--key-gap);
	}

	.row {
		display: flex;
		gap: var(--key-gap);
		justify-content: center;
	}

	.number-row {
		margin-left: calc(-4 * var(--key-unit) - 42px);
	}

	/* Shared transition for interactive elements */
	.key,
	.white-key,
	.black-key {
		cursor: pointer;
		transition:
			filter 0.08s ease,
			transform 0.08s ease,
			background-color 0.08s ease;
	}

	.key {
		min-width: var(--key-size);
		height: var(--key-size);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #374151;
		border-radius: 6px;
		padding: 4px 6px;
		gap: 3px;
	}

	.key:hover {
		filter: brightness(1.15);
	}

	.key:focus,
	.white-key:focus,
	.black-key:focus {
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
		height: calc(2 * var(--key-size));
		width: calc(10 * var(--key-unit));
	}

	/* White keys - tall piano-style */
	.white-key {
		position: absolute;
		left: calc(var(--key-index) * var(--key-unit));
		width: var(--key-size);
		height: calc(2 * var(--key-size));
		display: flex;
		flex-direction: column;
		border-radius: 6px;
		overflow: hidden;
		background: #4b5563;
	}

	.white-key:hover {
		filter: brightness(1.15);
	}

	.white-key.pressed {
		/* Scale down and translate up so top edge stays fixed */
		/* 128px height * 0.03 (3% shrink) / 2 = ~2px offset */
		transform: scale(0.97) translateY(-2px);
		filter: brightness(0.85);
	}

	.white-key-top {
		flex: 1;
	}

	.white-key-bottom {
		height: var(--key-size);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
	}

	.white-key .key-function {
		color: #f3f4f6;
		font-size: 20px;
	}

	/* Dark key style - shared by black piano keys, action keys, modifier keys, spacebar */
	.dark-key {
		background: #1f2937;
	}

	.dark-key:hover {
		filter: brightness(1.25);
	}

	.dark-key .key-label {
		color: #9ca3af;
	}

	.dark-key .key-function {
		color: #f3f4f6;
	}

	.dark-key.pressed {
		transform: scale(0.95) translateY(-1.6px);
		background: #374151;
		filter: brightness(0.9);
	}

	/* Black keys - square, positioned between white keys */
	.black-key {
		position: absolute;
		left: calc(var(--key-index) * var(--key-unit) - 26px);
		width: var(--key-size);
		height: var(--key-size);
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		z-index: 1;
	}

	.black-key .key-function {
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
		min-width: calc(var(--key-size) * 1.5);
	}

	.space-key {
		min-width: calc(var(--key-size) * 5);
	}

	/* Space key has slightly different pressed animation due to its width */
	.space-key.pressed {
		transform: scale(0.98) translateY(-1px);
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
