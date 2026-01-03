<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import Piano from '$lib/components/Piano.svelte';
	import Keyboard from '$lib/components/Keyboard.svelte';
	import { Key } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';

	// Map Alt+number key codes to degrees (macOS produces special characters)
	const altKeyCodeToDegree: Record<string, number> = {
		'¡': 1, '™': 2, '£': 3, '¢': 4, '∞': 5, '§': 6, '¶': 7
	};

	function handleKeydown(e: KeyboardEvent) {
		let degree: number;
		let inversion: 0 | 1 | 2 = 0;

		// Check for Alt+number (macOS produces special characters)
		if (e.altKey && altKeyCodeToDegree[e.key]) {
			degree = altKeyCodeToDegree[e.key];
			inversion = 2; // Alt/Option = 2nd inversion
		} else {
			degree = parseInt(e.key);
			if (degree >= 1 && degree <= 7) {
				if (e.ctrlKey || e.metaKey) inversion = 1;  // Ctrl/Cmd = 1st inversion
			} else {
				return; // Not a valid degree key
			}
		}

		if (degree >= 1 && degree <= 7) {
			// Get triads based on current mode
			// In minor mode, use the relative minor (e.g., Am for C)
			const triads = musicState.mode === 'major'
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
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="app-layout">
	<div class="top-area">
		<div class="left-half">
			<CircleOfFifths />
		</div>
		<div class="right-half">
			<Keyboard />
		</div>
	</div>
	<div class="bottom-area">
		<Piano />
	</div>
</div>
