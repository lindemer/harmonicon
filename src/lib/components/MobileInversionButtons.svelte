<script lang="ts">
	import { keyboardState } from '$lib/stores/keyboard.svelte';

	let { layout = 'horizontal' }: { layout?: 'horizontal' | 'vertical' } = $props();

	let firstInvPressed = $state(false);
	let secondInvPressed = $state(false);

	function handleFirstInvStart(e: Event) {
		e.preventDefault();
		firstInvPressed = true;
		keyboardState.altMousePressed = true;
	}

	function handleFirstInvEnd(e: Event) {
		e.preventDefault();
		firstInvPressed = false;
		keyboardState.altMousePressed = false;
	}

	function handleSecondInvStart(e: Event) {
		e.preventDefault();
		secondInvPressed = true;
		keyboardState.shiftMousePressed = true;
	}

	function handleSecondInvEnd(e: Event) {
		e.preventDefault();
		secondInvPressed = false;
		keyboardState.shiftMousePressed = false;
	}
</script>

<div class="inversion-buttons" class:vertical={layout === 'vertical'}>
	<button
		class="inversion-btn"
		class:pressed={firstInvPressed}
		ontouchstart={handleFirstInvStart}
		ontouchend={handleFirstInvEnd}
		ontouchcancel={handleFirstInvEnd}
		onmousedown={handleFirstInvStart}
		onmouseup={handleFirstInvEnd}
		onmouseleave={handleFirstInvEnd}
	>
		<span class="font-music">1<sup>st</sup></span>
	</button>
	<button
		class="inversion-btn"
		class:pressed={secondInvPressed}
		ontouchstart={handleSecondInvStart}
		ontouchend={handleSecondInvEnd}
		ontouchcancel={handleSecondInvEnd}
		onmousedown={handleSecondInvStart}
		onmouseup={handleSecondInvEnd}
		onmouseleave={handleSecondInvEnd}
	>
		<span class="font-music">2<sup>nd</sup></span>
	</button>
</div>

<style>
	.inversion-buttons {
		--btn-gap: 4px;
		--btn-radius: 6px;
		display: flex;
		gap: var(--btn-gap);
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	.inversion-buttons.vertical {
		flex-direction: column;
	}

	.inversion-btn {
		border-radius: var(--btn-radius);
		border: none;
		background: #1f2937;
		color: #e5e7eb;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			transform 0.08s ease,
			filter 0.08s ease,
			background-color 0.08s ease;
	}

	/* Horizontal: fill width equally */
	.inversion-buttons:not(.vertical) {
		width: 100%;
	}

	.inversion-buttons:not(.vertical) .inversion-btn {
		flex: 1;
		height: 2.5rem;
	}

	/* Vertical: fixed width, height from aspect ratio */
	.inversion-buttons.vertical .inversion-btn {
		width: var(--landscape-btn-size, 3rem);
		aspect-ratio: 1 / 3.5;
	}

	.inversion-btn:hover {
		filter: brightness(1.25);
	}

	.inversion-btn.pressed {
		transform: scale(0.97);
		background: #374151;
		filter: brightness(0.9);
	}
</style>
