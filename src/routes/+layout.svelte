<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import Piano from '$lib/components/Piano.svelte';
	import Keyboard from '$lib/components/Keyboard.svelte';
	import { appState } from '$lib/stores/app.svelte';
	import { midiState } from '$lib/stores/midi.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// Wire up MIDI input to appState (visual feedback only, no MIDI echo)
	midiState.setMidiInputHandlers(
		(note, octave) => appState.addPressedNoteFromMidi(note, octave),
		(note, octave) => appState.removePressedNoteFromMidi(note, octave)
	);

	// Initialize MIDI on mount (browser only)
	onMount(() => {
		midiState.initialize();
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
	<div class="mobile-circle">
		<CircleOfFifths />
	</div>
</div>
{@render children()}
