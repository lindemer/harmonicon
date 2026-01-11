<script lang="ts">
	import { midiState } from '$lib/stores/midi.svelte';

	interface Props {
		type: 'input' | 'output';
	}

	let { type }: Props = $props();

	const isInput = $derived(type === 'input');
	const isOpen = $derived(isInput ? midiState.isInputMenuOpen : midiState.isOutputMenuOpen);
	const devices = $derived(isInput ? midiState.availableInputs : midiState.availableOutputs);
	const selectedId = $derived(isInput ? midiState.selectedInputId : midiState.selectedOutputId);

	function closeMenu() {
		if (isInput) {
			midiState.isInputMenuOpen = false;
		} else {
			midiState.isOutputMenuOpen = false;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.midi-dropdown') && !target.closest('.midi-key-trigger')) {
			closeMenu();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeMenu();
		}
	}

	// Only register handlers when this menu is open
	$effect(() => {
		if (isOpen) {
			window.addEventListener('click', handleClickOutside);
			window.addEventListener('keydown', handleKeydown);
			return () => {
				window.removeEventListener('click', handleClickOutside);
				window.removeEventListener('keydown', handleKeydown);
			};
		}
	});

	function handleSelectDevice(deviceId: string) {
		if (isInput) {
			if (midiState.selectedInputId === deviceId) {
				midiState.selectInput(null);
			} else {
				midiState.selectInput(deviceId);
			}
		} else {
			if (midiState.selectedOutputId === deviceId) {
				midiState.selectOutput(null);
			} else {
				midiState.selectOutput(deviceId);
			}
		}
	}
</script>

{#if isOpen}
	<div class="midi-dropdown" role="menu" aria-label="MIDI {type} devices">
		{#if !midiState.isSupported}
			<p class="message error">Web MIDI not supported. Try Chrome or Edge.</p>
		{:else if midiState.initError}
			<p class="message error">{midiState.initError}</p>
		{:else if devices.length === 0}
			<p class="message">No MIDI {type}s found</p>
		{:else}
			{#each devices as device (device.id)}
				<button
					class="device-btn"
					class:selected={selectedId === device.id}
					onclick={() => handleSelectDevice(device.id)}
					role="menuitem"
				>
					<span class="device-name">{device.name || 'Unknown Device'}</span>
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
