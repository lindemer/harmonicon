<script lang="ts">
	import { sequencerState, type CellValue } from '$lib/stores/sequencer.svelte';

	let hoveredCell: { col: number; row: number } | null = $state(null);
	let dragMode: 'none' | 'increment' | 'clear' = $state('none');

	function getCellColor(value: CellValue, hover: boolean): string {
		if (value === 0) return hover ? '#4b5563' : '#374151'; // gray-600/gray-700
		return hover ? `var(--degree-${value}-hover)` : `var(--degree-${value})`;
	}

	function isHovered(col: number, row: number): boolean {
		return hoveredCell?.col === col && hoveredCell?.row === row;
	}

	function handleMouseDown(e: MouseEvent, col: number, row: number) {
		if (e.button === 0) {
			dragMode = 'increment';
			sequencerState.toggleCell(col, row);
		} else if (e.button === 2) {
			dragMode = 'clear';
			sequencerState.clearCell(col, row);
		}
	}

	function handleMouseEnter(col: number, row: number) {
		hoveredCell = { col, row };
		if (dragMode === 'increment') {
			sequencerState.toggleCell(col, row);
		} else if (dragMode === 'clear') {
			sequencerState.clearCell(col, row);
		}
	}

	function handleMouseUp() {
		dragMode = 'none';
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
	}
</script>

<svelte:window onmouseup={handleMouseUp} />

<div class="flex h-full items-center justify-center py-8">
	<div class="grid gap-1" style="grid-template-columns: repeat(8, 1fr);">
		{#each { length: 16 } as _, row}
			{#each { length: 8 } as _, col}
				<button
					class="aspect-square w-8 cursor-pointer rounded"
					style="background-color: {getCellColor(sequencerState.getCell(col, row), isHovered(col, row))}"
					onmousedown={(e) => handleMouseDown(e, col, row)}
					onmouseenter={() => handleMouseEnter(col, row)}
					onmouseleave={() => (hoveredCell = null)}
					oncontextmenu={handleContextMenu}
					aria-label="Step {row + 1}, track {col + 1}, value {sequencerState.getCell(col, row)}"
				></button>
			{/each}
		{/each}
	</div>
</div>
