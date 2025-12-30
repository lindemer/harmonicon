<script lang="ts">
	import { musicState } from '$lib/stores/music.svelte';
</script>

<div class="flex justify-start mb-2">
	<button
		class="flex bg-gray-700 rounded overflow-hidden font-music text-lg cursor-pointer"
		onclick={() => musicState.toggleMode()}
	>
		<span class="px-2 py-0.5 {musicState.mode === 'major' ? 'bg-gray-500 text-white' : 'text-gray-400'}">
			△
		</span>
		<span class="px-2 py-0.5 {musicState.mode === 'minor' ? 'bg-gray-500 text-white' : 'text-gray-400'}">
			m
		</span>
	</button>
</div>
