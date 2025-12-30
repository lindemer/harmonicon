<script>
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import KeyboardController from '$lib/components/KeyboardController.svelte';
	import PianoKeyboard from '$lib/components/PianoKeyboard.svelte';
</script>

<main class="min-h-screen flex flex-col items-center justify-center gap-8 bg-gray-900 p-8">
	<CircleOfFifths />
	<div class="w-full max-w-2xl flex flex-col">
		<KeyboardController />
		<PianoKeyboard />
	</div>
</main>
