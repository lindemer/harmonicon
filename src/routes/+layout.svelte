<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import LeftPanel from '$lib/components/LeftPanel.svelte';
	import RightPanel from '$lib/components/RightPanel.svelte';
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="app-layout">
	<div class="left-panel">
		<LeftPanel />
	</div>
	<div class="right-panel">
		<RightPanel />
	</div>
</div>
