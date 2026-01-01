<script>
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import KeyboardController from '$lib/components/KeyboardController.svelte';
	import Piano from '$lib/components/Piano.svelte';
</script>

<main class="h-full flex flex-col items-center justify-center bg-gray-900 gap-4 p-4 overflow-hidden">
	<CircleOfFifths />
	<div class="w-full max-w-2xl flex flex-col">
		<KeyboardController />
		<Piano />
	</div>
</main>
