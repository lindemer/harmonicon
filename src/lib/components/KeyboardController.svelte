<script lang="ts">
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';

	function getChordRomanNumeral(): { numeral: string; isDiatonic: boolean } | null {
		if (!musicState.selectedChord) return null;

		// Convert formatted chord to Tonal notation
		const chordSymbol = FormatUtil.unformatNote(musicState.selectedChord);
		return FormatUtil.getChordRomanNumeral(chordSymbol, musicState.selectedRoot, musicState.mode);
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
