<script lang="ts">
	import { appState } from '$lib/stores/app.svelte';
	import { FormatUtil } from '$lib/utils/format.util';
	import Chord from './Chord.svelte';
	import MidiMenu from './MidiMenu.svelte';
	import { keyboardState } from '$lib/stores/keyboard.svelte';
	import { midiState } from '$lib/stores/midi.svelte';

	const kb = keyboardState;

	// Responsive scaling
	let containerWidth = $state(0);
	let containerHeight = $state(0);
	const KEYBOARD_NATURAL_WIDTH = 750;
	const KEYBOARD_NATURAL_HEIGHT = 332;
	const CONTAINER_PADDING = 0;
	// Tab key overflows left by 1.5 * 64px + 4px = 100px
	const TAB_KEY_OVERFLOW = 100;

	const keyboardScale = $derived(
		containerWidth > 0 && containerHeight > 0
			? Math.min(
					(containerWidth - CONTAINER_PADDING) / (KEYBOARD_NATURAL_WIDTH + TAB_KEY_OVERFLOW),
					(containerHeight - CONTAINER_PADDING) / KEYBOARD_NATURAL_HEIGHT
				)
			: 0
	);

	// Helper functions that delegate to FormatUtil with current app state
	function getDegreeColorForInversion(
		degree: number,
		inv: 0 | 1 | 2 | 3,
		isSeventh: boolean,
		isNinth: boolean
	): string {
		return FormatUtil.getDegreeColorForInversion(
			degree,
			inv,
			isSeventh,
			isNinth,
			appState.selectedRoot,
			appState.mode
		);
	}

	function getRomanNumeral(degree: number): string {
		return FormatUtil.getDiatonicRomanNumeral(degree, appState.mode);
	}

	function getNoteColor(noteName: string): string | undefined {
		return FormatUtil.getNoteColor(noteName, appState.selectedRoot);
	}

	function getChordRomanNumeral(
		note: string,
		isMinor: boolean,
		isSeventh: boolean,
		isNinth: boolean
	): string | null {
		// Build chord symbol
		let chordSymbol = note + (isMinor ? 'm' : '');
		if (isNinth) chordSymbol += '9';
		else if (isSeventh) chordSymbol += isMinor ? '7' : 'maj7';

		const result = FormatUtil.getChordRomanNumeral(
			chordSymbol,
			appState.selectedRoot,
			appState.mode
		);
		return result?.numeral ?? null;
	}

	function getChordDisplayInfo(
		note: string,
		isMinor: boolean,
		inv: 0 | 1 | 2 | 3,
		isSeventh: boolean,
		isNinth: boolean,
		keyRoot: string
	): { root: string; bassNote: string | undefined } {
		return FormatUtil.getChordDisplayInfo(note, isMinor, inv, isSeventh, isNinth, keyRoot);
	}
</script>

<svelte:window onkeydown={kb.handleKeydown} onkeyup={kb.handleKeyup} onblur={kb.handleBlur} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="keyboard-container"
	bind:clientWidth={containerWidth}
	bind:clientHeight={containerHeight}
	onmouseup={kb.handleMouseUp}
	onmouseleave={kb.handleMouseUp}
	oncontextmenu={(e) => e.preventDefault()}
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
						? getDegreeColorForInversion(degree, kb.inversion, kb.tabPressed, kb.ninePressed)
						: undefined}
					onmousedown={() => degree && kb.handleDegreeMouseDown(degree)}
					onmouseenter={() => degree && kb.handleDegreeMouseEnter(degree)}
					role="button"
					tabindex="0"
				>
					<span class="key-label">{key}</span>
					{#if degree}
						<span class="key-function"
							><Chord
								numeral={getRomanNumeral(degree)}
								inversion={kb.inversion}
								isSeventh={kb.tabPressed}
								isNinth={kb.ninePressed}
							/></span
						>
					{/if}
				</div>
			{/each}
			<!-- 8 key placeholder (disabled) -->
			<div class="key dark-key disabled-key">
				<span class="key-label">8</span>
			</div>
			<!-- 9 key placeholder (disabled) -->
			<div class="key dark-key disabled-key">
				<span class="key-label">9</span>
			</div>
			<!-- 0 key placeholder (disabled) -->
			<div class="key dark-key disabled-key">
				<span class="key-label">0</span>
			</div>
		</div>

		<!-- Piano keys section with Tab key -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="piano-section" onmousemove={kb.handlePianoSectionMouseMove}>
			<!-- Tab key (7th mode toggle) - positioned to left of piano keys -->
			<div
				class="key wide-key dark-key tab-key"
				class:pressed={kb.tabPressed}
				class:disabled-key={kb.ninePressed}
				onmousedown={() => (kb.tabMousePressed = true)}
				onmouseup={() => (kb.tabMousePressed = false)}
				onmouseleave={() => (kb.tabMousePressed = false)}
				role="button"
				tabindex="0"
			>
				<span class="key-label">tab</span>
				<span class="key-function font-music">7<sup>th</sup></span>
			</div>
			<!-- Caps Lock key - positioned below Tab key, shows parallel major/minor state -->
			<div
				class="key wide-key dark-key caps-key"
				class:disabled-key={appState.playMode === 'notes'}
			>
				<span class="key-label">caps</span>
				{#if appState.playMode !== 'notes'}
					<span class="key-function caps-label">
						<span>PARALLEL</span>
						<span class="caps-mode">{kb.capsLockOn ? 'MINOR' : 'MAJOR'}</span>
					</span>
				{/if}
			</div>
			{#each kb.pianoKeys as pk, i (pk.white)}
				{@const isChordMode = appState.playMode === 'chords'}
				{@const whiteChordInfo = isChordMode
					? getChordDisplayInfo(
							pk.note,
							kb.capsLockOn,
							kb.inversion,
							kb.tabPressed,
							kb.ninePressed,
							appState.selectedRoot
						)
					: { root: pk.note, bassNote: undefined }}
				{@const whiteRomanNumeral = isChordMode
					? getChordRomanNumeral(pk.note, kb.capsLockOn, kb.tabPressed, kb.ninePressed)
					: null}
				{@const whiteNoteColor =
					isChordMode && whiteChordInfo.bassNote
						? getNoteColor(FormatUtil.unformatNote(whiteChordInfo.bassNote))
						: getNoteColor(pk.note)}
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
						<span class="key-function"
							><Chord
								numeral={isChordMode && whiteRomanNumeral ? whiteRomanNumeral : whiteChordInfo.root}
								inversion={isChordMode ? kb.inversion : 0}
								isSeventh={isChordMode && kb.tabPressed}
								isNinth={isChordMode && kb.ninePressed}
								displayMode={isChordMode ? 'roman' : 'letter'}
								color={whiteNoteColor ?? 'var(--text-primary)'}
							/></span
						>
					</div>
				</div>
				<!-- Black key (if present) -->
				{#if pk.black && pk.blackNote}
					{@const displayBlackNote = FormatUtil.usesFlatNotation(appState.selectedRoot)
						? FormatUtil.toFlatNotation(pk.blackNote)
						: pk.blackNote}
					{@const blackChordInfo = isChordMode
						? getChordDisplayInfo(
								displayBlackNote,
								kb.capsLockOn,
								kb.inversion,
								kb.tabPressed,
								kb.ninePressed,
								appState.selectedRoot
							)
						: { root: FormatUtil.formatNote(displayBlackNote), bassNote: undefined }}
					{@const blackKeyColor =
						isChordMode && blackChordInfo.bassNote
							? getNoteColor(FormatUtil.unformatNote(blackChordInfo.bassNote))
							: blackNoteColor}
					{@const blackRomanNumeral = isChordMode
						? getChordRomanNumeral(displayBlackNote, kb.capsLockOn, kb.tabPressed, kb.ninePressed)
						: null}
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
						<span class="key-function"
							><Chord
								numeral={isChordMode && blackRomanNumeral
									? blackRomanNumeral
									: FormatUtil.formatNote(blackChordInfo.root)}
								inversion={isChordMode ? kb.inversion : 0}
								isSeventh={isChordMode && kb.tabPressed}
								isNinth={isChordMode && kb.ninePressed}
								displayMode={isChordMode ? 'roman' : 'letter'}
								color={blackKeyColor ?? 'var(--text-primary)'}
							/></span
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
				class:disabled-key={kb.ninePressed}
				onmousedown={() => (kb.shiftMousePressed = true)}
				onmouseup={() => (kb.shiftMousePressed = false)}
				onmouseleave={() => (kb.shiftMousePressed = false)}
				role="button"
				tabindex="0"
			>
				<span class="key-label">⇧</span>
				<span class="key-function font-music"
					>{#if kb.tabPressed && kb.altPressed}3<sup>rd</sup>{:else}2<sup>nd</sup>{/if}</span
				>
			</div>

			{#each kb.bottomRow as key (key)}
				{@const action = kb.actionMap[key]}
				{@const isVoicingKey = key === 'V'}
				{@const isPlayModeKey = key === 'C'}
				{@const isOctaveDownDisabled = key === 'Z' && appState.chordDisplayOctave <= 3}
				{@const isOctaveUpDisabled = key === 'X' && appState.chordDisplayOctave >= 5}
				<div
					class="key dark-key"
					class:pressed={kb.isActionKeyPressed(key)}
					class:disabled-key={isOctaveDownDisabled || isOctaveUpDisabled}
					onmousedown={() => {
						if (isOctaveDownDisabled || isOctaveUpDisabled) return;
						kb.clickedActionKey = key;
						if (key === 'Z') appState.decrementChordOctave();
						else if (key === 'X') appState.incrementChordOctave();
						else if (key === 'V') appState.toggleVoicingMode();
						else if (key === 'C') appState.togglePlayMode();
					}}
					onmouseup={() => (kb.clickedActionKey = null)}
					onmouseleave={() => (kb.clickedActionKey = null)}
					role="button"
					tabindex="0"
				>
					<span class="key-label">{key}</span>
					{#if isVoicingKey}
						<span class="key-function voicing-label">
							<span class="voicing-mode">{appState.voicingMode === 'open' ? 'OPEN' : 'CLOSED'}</span
							>
							<span>VOICE</span>
						</span>
					{:else if isPlayModeKey}
						<span class="key-function play-mode-label">
							<span>PLAY</span>
							<span class="play-mode">{appState.playMode === 'notes' ? 'NOTES' : 'CHORDS'}</span>
						</span>
					{:else if action}
						<span
							class="key-function octave-label"
							class:disabled-label={isOctaveDownDisabled || isOctaveUpDisabled}
						>
							<span>{action.text}</span>
							<span>{action.text2}</span>
						</span>
					{/if}
				</div>
			{/each}
			<!-- B key (disabled placeholder) -->
			<div class="key dark-key disabled-key">
				<span class="key-label">B</span>
			</div>
			<!-- N key (MIDI IN toggle) -->
			<div class="midi-key-wrapper">
				<div
					class="key dark-key midi-key-trigger"
					class:pressed={kb.nKeyPressed}
					onmousedown={() => {
						kb.nKeyPressed = true;
						midiState.toggleInputMenu();
					}}
					onmouseup={() => (kb.nKeyPressed = false)}
					onmouseleave={() => (kb.nKeyPressed = false)}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							midiState.toggleInputMenu();
						}
					}}
					role="button"
					tabindex="0"
				>
					<span class="key-label">N</span>
					<span class="key-function midi-label">
						<span>MIDI</span>
						<span class:midi-active={midiState.isInputConnected}>IN</span>
					</span>
				</div>
				<MidiMenu type="input" />
			</div>
			<!-- M key (MIDI OUT toggle) -->
			<div class="midi-key-wrapper">
				<div
					class="key dark-key midi-key-trigger"
					class:pressed={kb.mKeyPressed}
					onmousedown={() => {
						kb.mKeyPressed = true;
						midiState.toggleOutputMenu();
					}}
					onmouseup={() => (kb.mKeyPressed = false)}
					onmouseleave={() => (kb.mKeyPressed = false)}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							midiState.toggleOutputMenu();
						}
					}}
					role="button"
					tabindex="0"
				>
					<span class="key-label">M</span>
					<span class="key-function midi-label">
						<span>MIDI</span>
						<span class:midi-active={midiState.isOutputConnected}>OUT</span>
					</span>
				</div>
				<MidiMenu type="output" />
			</div>
			<!-- Comma key (disabled) -->
			<div class="key dark-key disabled-key">
				<span class="key-label">,</span>
			</div>
			<!-- Period key (disabled) -->
			<div class="key dark-key disabled-key">
				<span class="key-label">.</span>
			</div>
		</div>

		<!-- Modifier row -->
		<div class="row modifier-row">
			<div
				class="key dark-key ctrl-key"
				class:pressed={kb.ninePressed}
				class:disabled-key={kb.tabPressed || kb.altPressed || kb.shiftPressed}
				onmousedown={() => (kb.ctrlMousePressed = true)}
				onmouseup={() => (kb.ctrlMousePressed = false)}
				onmouseleave={() => (kb.ctrlMousePressed = false)}
				role="button"
				tabindex="0"
			>
				<span class="key-label">ctrl</span>
				<span class="key-function font-music">9<sup>th</sup></span>
			</div>
			<div
				class="key dark-key"
				class:pressed={kb.altPressed}
				class:disabled-key={kb.ninePressed}
				onmousedown={() => (kb.altMousePressed = true)}
				onmouseup={() => (kb.altMousePressed = false)}
				onmouseleave={() => (kb.altMousePressed = false)}
				role="button"
				tabindex="0"
			>
				<span class="key-label">⌥</span>
				<span class="key-function font-music"
					>{#if kb.tabPressed && kb.shiftPressed}3<sup>rd</sup>{:else}1<sup>st</sup>{/if}</span
				>
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
				<span class="key-label">SPACEBAR</span>
				<span class="key-function space-label">
					<span>TOGGLE MODE</span>
					<span class="space-mode">{appState.mode === 'major' ? 'MAJOR' : 'MINOR'}</span>
				</span>
			</div>
			<!-- Second command key (disabled) -->
			<div class="key dark-key disabled-key">
				<span class="key-label">⌘</span>
			</div>
			<!-- Second alt key (mirrors first alt key) -->
			<div
				class="key dark-key"
				class:pressed={kb.altPressed}
				class:disabled-key={kb.ninePressed}
				onmousedown={() => (kb.altMousePressed = true)}
				onmouseup={() => (kb.altMousePressed = false)}
				onmouseleave={() => (kb.altMousePressed = false)}
				role="button"
				tabindex="0"
			>
				<span class="key-label">⌥</span>
				<span class="key-function font-music"
					>{#if kb.tabPressed && kb.shiftPressed}3<sup>rd</sup>{:else}1<sup>st</sup>{/if}</span
				>
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
		/* Extra left padding to accommodate Tab key overflow */
		padding: 0 0 0 calc(1.5 * var(--key-size) + var(--key-gap));
		user-select: none;
		overflow: hidden;
		--key-size: 64px;
		--key-gap: 4px;
		--key-unit: calc(var(--key-size) + var(--key-gap));
	}

	.keyboard {
		display: flex;
		flex-direction: column;
		gap: var(--key-gap);
		overflow: visible;
	}

	.row {
		display: flex;
		gap: var(--key-gap);
		justify-content: center;
	}

	.number-row {
		/* Adjusted for 10 keys (1-7 + 8 + 9 + 0) */
		margin-left: calc(-1 * var(--key-unit) - 42px);
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
		position: relative;
		min-width: var(--key-size);
		height: var(--key-size);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--bg-tertiary);
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
		color: var(--text-secondary);
		font-family: system-ui, sans-serif;
		text-transform: uppercase;
	}

	.key-function {
		font-size: 20px;
		color: var(--text-primary);
		line-height: 1;
	}

	/* Absolute positioning for all square keys (degree keys, dark keys, black piano keys) */
	.key > .key-label,
	.black-key > .key-label {
		position: absolute;
		top: 10px;
		width: 100%;
		text-align: center;
	}

	.key > .key-function,
	.black-key > .key-function {
		position: absolute;
		top: 30px;
		width: 100%;
		text-align: center;
	}

	/* Dark keys text shifted down slightly to align visually */
	.dark-key > .key-label {
		top: 12px;
	}

	.dark-key > .key-function {
		top: 32px;
	}

	/* Piano section - positioned layout */
	.piano-section {
		position: relative;
		height: calc(2 * var(--key-size) + var(--key-gap));
		width: calc(10 * var(--key-unit));
		overflow: visible;
	}

	/* Tab key - positioned to left of piano keys, aligned with black keys */
	.tab-key {
		position: absolute;
		left: calc(-1.5 * var(--key-size) - var(--key-gap));
		top: 0;
		height: var(--key-size);
	}

	/* Caps key - positioned below Tab key, display-only (not clickable) */
	.caps-key {
		position: absolute;
		left: calc(-1.5 * var(--key-size) - var(--key-gap));
		top: calc(var(--key-size) + var(--key-gap));
		height: var(--key-size);
		cursor: default;
	}

	.caps-key.dark-key:hover {
		filter: none;
	}

	/* White keys - tall piano-style */
	.white-key {
		position: absolute;
		left: calc(var(--key-index) * var(--key-unit));
		width: var(--key-size);
		height: calc(2 * var(--key-size) + var(--key-gap));
		display: flex;
		flex-direction: column;
		border-radius: 6px;
		overflow: hidden;
		background: var(--kb-white-key);
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
		color: var(--text-primary);
		font-size: 20px;
	}

	/* Dark key style - shared by black piano keys, action keys, modifier keys, spacebar */
	.dark-key {
		background: var(--bg-secondary);
	}

	.dark-key:hover {
		filter: brightness(1.25);
	}

	.dark-key .key-label {
		color: var(--text-secondary);
	}

	.dark-key .key-function {
		color: var(--text-primary);
	}

	.dark-key.pressed {
		transform: scale(0.95) translateY(-1.6px);
		background: var(--bg-tertiary);
		filter: brightness(0.9);
	}

	/* Black keys - square, positioned between white keys */
	.black-key {
		position: absolute;
		left: calc(var(--key-index) * var(--key-unit) - 26px);
		width: var(--key-size);
		height: var(--key-size);
		border-radius: 6px;
		z-index: 1;
	}

	.black-key .key-function {
		font-size: 16px;
	}

	/* Degree keys (1-7) with colored backgrounds */
	.degree-key .key-label {
		color: var(--degree-label);
	}

	.degree-key .key-function {
		color: white;
		font-weight: 500;
	}

	.degree-key.pressed {
		transform: scale(0.95);
		filter: brightness(0.8);
	}

	/* Disabled keys (ctrl, cmd, and dynamically disabled modifier keys) */
	.disabled-key {
		cursor: default;
	}

	.disabled-key:hover {
		filter: none;
	}

	.disabled-key .key-label {
		color: var(--kb-disabled);
	}

	.disabled-key .key-function {
		color: var(--kb-disabled);
	}

	/* Wide keys */
	.wide-key {
		min-width: calc(var(--key-size) * 1.5);
	}

	.space-key {
		min-width: calc(var(--key-size) * 5);
	}

	.ctrl-key {
		min-width: var(--key-size);
	}

	/* Space key has slightly different pressed animation due to its width */
	.space-key.pressed {
		transform: scale(0.98) translateY(-1px);
	}

	/* Spacebar label and function positioning - use same values as dark-key */
	.space-key > .key-label {
		position: absolute;
		top: 12px;
		width: 100%;
		text-align: center;
	}

	.space-key > .key-function {
		position: absolute;
		top: 28px;
		width: 100%;
		text-align: center;
	}

	.bottom-row {
		justify-content: flex-start;
		margin-left: calc(-1.5 * var(--key-size) - var(--key-gap));
	}

	.bottom-row .wide-key {
		min-width: calc(var(--key-size) * 2 + 0.5 * var(--key-gap));
	}

	.modifier-row {
		justify-content: flex-start;
		margin-left: calc(-0.75 * var(--key-size) - var(--key-gap));
	}

	.dark-key > .voicing-label,
	.dark-key > .octave-label,
	.dark-key > .play-mode-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0.5px;
		line-height: 1.3;
		top: 28px;
		color: var(--text-primary);
	}

	.voicing-mode,
	.play-mode {
		color: var(--accent-color);
	}

	.octave-label.disabled-label {
		color: var(--kb-disabled);
	}

	.caps-key > .caps-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0.5px;
		line-height: 1.3;
		top: 28px;
		color: var(--text-primary);
	}

	.caps-mode {
		color: var(--accent-color);
	}

	.space-key > .space-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0.5px;
		line-height: 1.3;
		top: 28px;
		color: var(--text-primary);
	}

	.space-mode {
		color: var(--accent-color);
	}

	.midi-key-wrapper {
		position: relative;
	}

	.dark-key > .midi-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-size: 10px;
		font-weight: 400;
		letter-spacing: 0.5px;
		line-height: 1.3;
		top: 28px;
		color: var(--text-primary);
	}

	.midi-active {
		color: var(--accent-color);
	}
</style>
