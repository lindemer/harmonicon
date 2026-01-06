<script lang="ts">
	import './layout.css';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import Piano from '$lib/components/Piano.svelte';
	import Keyboard from '$lib/components/Keyboard.svelte';
	import { Key } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format.util';
	import { setMuted } from '$lib/services/audio';
	import type { Snippet } from 'svelte';

	let muted = $state(true);

	function toggleMute() {
		muted = !muted;
		setMuted(muted);
	}

	let { children }: { children: Snippet } = $props();

	// Map special characters produced by Alt+number on macOS to degrees
	const altKeyCodeToDegree: Record<string, number> = {
		'¡': 1,
		'™': 2,
		'£': 3,
		'¢': 4,
		'∞': 5,
		'§': 6,
		'¶': 7, // Alt+1-7
		'⁄': 1,
		'€': 2,
		'‹': 3,
		'›': 4,
		ﬁ: 5,
		ﬂ: 6,
		'‡': 7 // Alt+Shift+1-7
	};

	function handleKeydown(e: KeyboardEvent) {
		let degree: number;
		let inversion: 0 | 1 | 2 = 0;

		// Check for Alt+number (macOS produces special characters)
		if (e.altKey && altKeyCodeToDegree[e.key]) {
			degree = altKeyCodeToDegree[e.key];
			// Shift determines inversion: Alt = 1st, Alt+Shift = 2nd
			inversion = e.shiftKey ? 2 : 1;
		} else {
			degree = parseInt(e.key);
			if (degree === 0) {
				musicState.selectedChord = null;
				musicState.pressedDegree = null;
				return;
			}
			if (!(degree >= 1 && degree <= 7)) {
				return; // Not a valid degree key
			}
		}

		if (degree >= 1 && degree <= 7) {
			// Set pressed state for visual feedback
			musicState.pressedDegree = degree;

			// Get triads based on current mode
			// In minor mode, use the relative minor (e.g., Am for C)
			const triads =
				musicState.mode === 'major'
					? Key.majorKey(musicState.selectedRoot).triads
					: Key.minorKey(Key.majorKey(musicState.selectedRoot).minorRelative).natural.triads;

			const chord = triads[degree - 1];
			if (chord) {
				// Format the chord (e.g., 'F#m' -> 'F♯m', 'Bdim' -> 'B°')
				const formatted = FormatUtil.formatNote(chord).replace('dim', '°');
				musicState.selectedChord = formatted;
				musicState.selectedInversion = inversion;
			}
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		// Clear degree on key release
		const degree = parseInt(e.key);
		if (degree >= 1 && degree <= 7) {
			musicState.pressedDegree = null;
		}
		// Handle Alt+number release (macOS special characters)
		if (altKeyCodeToDegree[e.key]) {
			musicState.pressedDegree = null;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />
<svelte:head>
	<title>Harmonicon</title>
</svelte:head>
<div class="app-layout">
	<button class="mute-button" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
		{#if muted}
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
					d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
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
					d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
				/>
			</svg>
		{/if}
	</button>
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
</div>
{@render children()}
