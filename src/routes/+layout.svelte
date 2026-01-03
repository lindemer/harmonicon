<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import Piano from '$lib/components/Piano.svelte';
	import Keyboard from '$lib/components/Keyboard.svelte';
</script>

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
