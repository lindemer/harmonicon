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
	<!-- Desktop theme toggle (top left) -->
	<button class="theme-toggle" onclick={() => themeState.toggle()} aria-label="Toggle theme">
		{#if themeState.isDark}
			<!-- Moon icon (show in dark mode) -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
				/>
			</svg>
		{:else}
			<!-- Sun icon (show in light mode) -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
				/>
			</svg>
		{/if}
	</button>

	<!-- Desktop layout -->
	<div class="top-area">
		<div class="left-half">
			<CircleOfFifths />
		</div>
		<div class="right-half">
			<div class="header">
				<h1>Harmonicon</h1>
				<a
					href="https://github.com/lindemer/harmonicon"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="View source"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
						/>
					</svg>
				</a>
			</div>
			<Keyboard />
		</div>
	</div>
	<div class="bottom-area">
		<Piano />
	</div>

	<!-- Mobile layout -->
	<div class="mobile-top-bar">
		<h1 class="mobile-title">Harmonicon</h1>
		<div class="mobile-top-right">
			<button class="mobile-icon-btn" onclick={() => themeState.toggle()} aria-label="Toggle theme">
				{#if themeState.isDark}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
						/>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
						/>
					</svg>
				{/if}
			</button>
			<a
				href="https://github.com/lindemer/harmonicon"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="View source"
				class="mobile-icon-btn"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
					/>
				</svg>
			</a>
		</div>
	</div>
	<div class="mobile-circle">
		<CircleOfFifths />
	</div>
</div>
{@render children()}
