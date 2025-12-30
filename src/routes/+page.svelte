<script>
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import KeyboardController from '$lib/components/KeyboardController.svelte';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
</script>

<main class="h-screen flex flex-col items-center justify-center bg-gray-900 p-8 overflow-hidden">
	<CircleOfFifths />
	<div class="w-full max-w-2xl flex flex-col">
		<KeyboardController />
		<PianoKeyboard />
	</div>
</main>
