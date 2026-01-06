<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { FormatUtil } from '$lib/utils/format.util';
	import { VoicingUtil } from '$lib/utils/voicing.util';
	import RomanNumeral from './RomanNumeral.svelte';
	import { keyboardState } from '$lib/stores/keyboard.svelte';

	const kb = keyboardState;

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
	onmouseup={kb.handleMouseUp}
	onmouseleave={kb.handleMouseUp}
	role="application"
>
	<div class="keyboard">
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
							><RomanNumeral numeral={getRomanNumeral(degree)} inversion={kb.inversion} /></span
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
				onmousedown={() => (kb.shiftPressed = true)}
				onmouseup={() => (kb.shiftPressed = false)}
				onmouseleave={() => (kb.shiftPressed = false)}
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
				onmousedown={() => (kb.altPressed = true)}
				onmouseup={() => (kb.altPressed = false)}
				onmouseleave={() => (kb.altPressed = false)}
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
	@import './Keyboard.css';
</style>
