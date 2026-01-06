<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { keyboardState } from '$lib/stores/keyboard.svelte';
	import { FormatUtil } from '$lib/utils/format.util';
	import { VoicingUtil } from '$lib/utils/voicing.util';
	import RomanNumeral from './RomanNumeral.svelte';

	let { layout = 'horizontal' }: { layout?: 'horizontal' | 'vertical' } = $props();

	const degrees = [1, 2, 3, 4, 5, 6, 7] as const;

	function getRomanNumeral(degree: number): string {
		return FormatUtil.getDiatonicRomanNumeral(degree, appState.mode);
	}

	function getDegreeColor(degree: number): string {
		const chord = VoicingUtil.getChordForDegree(degree, appState.selectedRoot, appState.mode);
		if (!chord || !chord.notes.length) {
			return FormatUtil.getDegreeColor(degree);
		}
		const inv = keyboardState.inversion;
		const bassNote = chord.notes[inv] ?? chord.notes[0];
		const bassDegree = FormatUtil.getNoteDegreeInMajorKey(bassNote, appState.selectedRoot);
		return FormatUtil.getDegreeColor(bassDegree ?? degree);
	}

	function handleDegreeStart(degree: number, e: Event) {
		e.preventDefault();
		keyboardState.handleDegreeMouseDown(degree);
	}

	function handleDegreeEnd(e: Event) {
		e.preventDefault();
		keyboardState.handleMouseUp();
	}
</script>

<div class="chord-buttons" class:vertical={layout === 'vertical'}>
	{#each degrees as degree (degree)}
		<button
			class="degree-btn"
			class:pressed={appState.pressedDegree === degree}
			style:background-color={getDegreeColor(degree)}
			ontouchstart={(e) => handleDegreeStart(degree, e)}
			ontouchend={handleDegreeEnd}
			ontouchcancel={handleDegreeEnd}
			onmousedown={(e) => handleDegreeStart(degree, e)}
			onmouseup={handleDegreeEnd}
			onmouseleave={handleDegreeEnd}
		>
			<RomanNumeral
				numeral={getRomanNumeral(degree)}
				inversion={keyboardState.inversion}
				color="white"
			/>
		</button>
	{/each}
</div>

<style>
	.chord-buttons {
		--btn-gap: 4px;
		--btn-radius: 6px;
		display: flex;
		gap: var(--btn-gap);
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	.chord-buttons.vertical {
		flex-direction: column;
	}

	.degree-btn {
		border-radius: var(--btn-radius);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: clamp(10px, 2.5vmin, 16px);
		transition:
			transform 0.08s ease,
			filter 0.08s ease;
	}

	/* Horizontal: fixed height, square buttons */
	.chord-buttons:not(.vertical) .degree-btn {
		height: var(--portrait-btn-size, 3rem);
		aspect-ratio: 1;
	}

	/* Vertical: fixed width, square buttons */
	.chord-buttons.vertical .degree-btn {
		width: var(--landscape-btn-size, 3rem);
		aspect-ratio: 1;
	}

	.degree-btn:hover {
		filter: brightness(1.15);
	}

	.degree-btn.pressed {
		transform: scale(0.95);
		filter: brightness(0.8);
	}
</style>
