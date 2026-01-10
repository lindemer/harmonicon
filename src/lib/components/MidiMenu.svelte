<script lang="ts">
	import { midiState } from '$lib/stores/midi.svelte';

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.midi-dropdown') && !target.closest('.midi-key-trigger')) {
			midiState.isMenuOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			midiState.isMenuOpen = false;
		}
	}

	function handleSelectDevice(inputId: string) {
		if (midiState.selectedInputId === inputId) {
			midiState.selectInput(null);
		} else {
			midiState.selectInput(inputId);
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

{#if midiState.isMenuOpen}
	<div class="midi-dropdown" role="menu" aria-label="MIDI devices">
		{#if !midiState.isSupported}
			<p class="message error">Web MIDI not supported. Try Chrome or Edge.</p>
		{:else if midiState.initError}
			<p class="message error">{midiState.initError}</p>
		{:else if midiState.availableInputs.length === 0}
			<p class="message">No MIDI devices found</p>
		{:else}
			{#each midiState.availableInputs as input (input.id)}
				<button
					class="device-btn"
					class:selected={midiState.selectedInputId === input.id}
					onclick={() => handleSelectDevice(input.id)}
					role="menuitem"
				>
					<span class="device-name">{input.name || 'Unknown Device'}</span>
				</button>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.midi-dropdown {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		background: #1f2937;
		border: 1px solid #374151;
		border-radius: 8px;
		min-width: 200px;
		max-width: 300px;
		padding: 6px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
		z-index: 100;
	}

	.message {
		color: #9ca3af;
		font-size: 12px;
		text-align: center;
		padding: 12px 8px;
		margin: 0;
	}

	.message.error {
		color: #f87171;
	}

	.device-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.1s;
	}

	.device-btn:hover {
		background: #374151;
	}

	.device-btn.selected .device-name {
		color: #f59e0b;
	}

	.device-name {
		color: #f3f4f6;
		font-size: 13px;
		font-weight: 500;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
