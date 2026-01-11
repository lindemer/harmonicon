<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import Piano from '$lib/components/Piano.svelte';
	import Keyboard from '$lib/components/Keyboard.svelte';
	import { appState } from '$lib/stores/app.svelte';
	import { midiState } from '$lib/stores/midi.svelte';
	import { themeState } from '$lib/stores/theme.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// Wire up MIDI input to appState (visual feedback only, no MIDI echo)
	midiState.setMidiInputHandlers(
		(note, octave) => appState.addPressedNoteFromMidi(note, octave),
		(note, octave) => appState.removePressedNoteFromMidi(note, octave)
	);

	// Initialize MIDI and theme on mount (browser only)
	onMount(() => {
		midiState.initialize();
		themeState.initialize();
	});
</script>

<svelte:head>
	<title>Harmonicon</title>
</svelte:head>
<div class="app-layout">
	<!-- Desktop layout -->
	<div class="top-area">
		<div class="left-half">
			<CircleOfFifths />
		</div>
		<div class="right-half">
			<div class="header">
				<a href="https://github.com/lindemer/harmonicon" target="_blank" rel="noopener noreferrer">
					<h1>Harmonicon</h1>
				</a>
				<button class="theme-toggle" onclick={() => themeState.toggle()} aria-label="Toggle theme">
					{#if themeState.isDark}
						<span class="theme-icon">🌖</span>
					{:else}
						<span class="theme-icon">𖤓</span>
					{/if}
				</button>
			</div>
			<Keyboard />
		</div>
	</div>
	<div class="bottom-area">
		<Piano />
	</div>

	<!-- Mobile layout -->
	<div class="mobile-top-bar">
		<a
			class="mobile-title"
			href="https://github.com/lindemer/harmonicon"
			target="_blank"
			rel="noopener noreferrer"
		>
			Harmonicon
		</a>
		<button class="mobile-icon-btn" onclick={() => themeState.toggle()} aria-label="Toggle theme">
			{#if themeState.isDark}
				<span class="theme-icon">🌖</span>
			{:else}
				<span class="theme-icon">𖤓</span>
			{/if}
		</button>
	</div>
	<div class="mobile-circle">
		<CircleOfFifths />
	</div>
</div>
{@render children()}
