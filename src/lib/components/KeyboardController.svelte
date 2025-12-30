<script lang="ts">
	import { Chord, Note } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { unformatNote } from '$lib/utils/format';

	// Roman numeral bases for chromatic scale (from root)
	const chromaticNumerals = ['I', '♯I/♭II', 'II', '♯II/♭III', 'III', 'IV', '♯IV/♭V', 'V', '♯V/♭VI', 'VI', '♯VI/♭VII', 'VII'];

	function getChordRomanNumeral(): { numeral: string; isDiatonic: boolean } | null {
		if (!musicState.selectedChord) return null;

		// Convert formatted chord to Tonal notation
		const chordSymbol = unformatNote(musicState.selectedChord);
		const chord = Chord.get(chordSymbol);
		if (chord.empty || !chord.tonic) return null;

		// First check if it's diatonic
		const degree = musicState.getScaleDegree(chordSymbol);
		if (degree) {
			// Diatonic chord - use proper roman numeral formatting
			const majorNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
			const minorNumerals = ['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII'];
			const numerals = musicState.mode === 'major' ? majorNumerals : minorNumerals;
			return { numeral: numerals[degree - 1], isDiatonic: true };
		}

		// Non-diatonic chord - compute from chromatic position
		const tonicChroma = Note.chroma(musicState.tonicRoot);
		const chordChroma = Note.chroma(chord.tonic);
		if (tonicChroma === undefined || chordChroma === undefined) return null;

		const semitones = (chordChroma - tonicChroma + 12) % 12;
		let base = chromaticNumerals[semitones];

		// Simplify the numeral based on the chord's accidental
		if (base.includes('/')) {
			// Choose sharp or flat based on chord spelling
			const chordRoot = chord.tonic;
			if (chordRoot.includes('#')) {
				base = base.split('/')[0]; // Use sharp version
			} else {
				base = base.split('/')[1]; // Use flat version
			}
		}

		// Adjust case based on chord quality
		if (chord.quality === 'Minor' || chord.quality === 'Diminished') {
			base = base.toLowerCase();
		}

		// Add quality suffix for diminished
		if (chord.quality === 'Diminished') {
			base += '°';
		}

		return { numeral: base, isDiatonic: false };
	}
</script>

<div class="flex justify-between items-center mb-2 select-none">
	<button
		class="font-music text-lg cursor-pointer"
		onclick={() => musicState.toggleMode()}
	>
		<span class="{musicState.mode === 'major' ? 'text-white' : 'text-gray-600'}">Δ</span>
		<span class="text-gray-600">/</span>
		<span class="{musicState.mode === 'minor' ? 'text-white' : 'text-gray-600'}">m</span>
	</button>
	{#if musicState.selectedChord}
		{@const result = getChordRomanNumeral()}
		<span class="font-music text-lg text-gray-300">
			{musicState.selectedChord}{#if result}<span class="{result.isDiatonic ? 'text-gray-400' : 'text-gray-600'} ml-2">({result.numeral})</span>{/if}
		</span>
	{/if}
</div>
