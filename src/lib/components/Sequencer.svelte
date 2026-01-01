<script lang="ts">
	import { sequencerState, type CellValue, type OctaveValue } from '$lib/stores/sequencer.svelte';

	let hoveredCell: { col: number; row: number } | null = $state(null);
	let dragMode: 'none' | 'increment' | 'clear' = $state('none');
	let isDraggingSlider = $state(false);
	let hoveredSlider: number | null = $state(null);
	let sliderAreaRef: HTMLElement | null = $state(null);
	let gridAreaRef: HTMLElement | null = $state(null);

	const SLIDER_HEIGHT = 60;
	const POSITIONS = 5;
	const KNOB_SIZE = 12;
	const COLUMN_WIDTH = 32; // w-8 = 2rem = 32px
	const GAP = 4; // gap-1 = 0.25rem = 4px
	const TOTAL_WIDTH = 8 * COLUMN_WIDTH + 7 * GAP;
	const ROWS = 16;
	const TOTAL_HEIGHT = ROWS * COLUMN_WIDTH + (ROWS - 1) * GAP;

	function getKnobY(value: OctaveValue): number {
		const trackHeight = SLIDER_HEIGHT - KNOB_SIZE;
		return (4 - value) * (trackHeight / (POSITIONS - 1));
	}

	function getKnobCenterY(value: OctaveValue): number {
		return getKnobY(value) + KNOB_SIZE / 2;
	}

	function yToOctaveValue(y: number): OctaveValue {
		const trackHeight = SLIDER_HEIGHT - KNOB_SIZE;
		const position = Math.round(((y - KNOB_SIZE / 2) / trackHeight) * (POSITIONS - 1));
		const clampedPosition = Math.max(0, Math.min(POSITIONS - 1, position));
		return (4 - clampedPosition) as OctaveValue;
	}

	function xToColumn(x: number): number {
		const col = Math.floor((x / TOTAL_WIDTH) * 8);
		return Math.max(0, Math.min(7, col));
	}

	function yToRow(y: number): number {
		const row = Math.floor((y / TOTAL_HEIGHT) * ROWS);
		return Math.max(0, Math.min(ROWS - 1, row));
	}

	function posToCell(x: number, y: number): { col: number; row: number } {
		return { col: xToColumn(x), row: yToRow(y) };
	}

	function handleSliderAreaMouseDown(e: MouseEvent) {
		e.preventDefault();
		isDraggingSlider = true;
		if (!sliderAreaRef) return;
		const rect = sliderAreaRef.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const col = xToColumn(x);
		sequencerState.setOctave(col, yToOctaveValue(y));
	}

	function handleSliderMouseMove(e: MouseEvent) {
		if (!isDraggingSlider || !sliderAreaRef) return;
		const rect = sliderAreaRef.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const col = xToColumn(x);
		sequencerState.setOctave(col, yToOctaveValue(y));
	}

	function handleSliderMouseUp() {
		isDraggingSlider = false;
	}

	function getCellColor(value: CellValue, hover: boolean): string {
		if (value === 0) return hover ? '#4b5563' : '#374151'; // gray-600/gray-700
		return hover ? `var(--degree-${value}-hover)` : `var(--degree-${value})`;
	}

	function isHovered(col: number, row: number): boolean {
		return hoveredCell?.col === col && hoveredCell?.row === row;
	}

	function handleGridMouseDown(e: MouseEvent) {
		if (!gridAreaRef) return;
		const rect = gridAreaRef.getBoundingClientRect();
		const { col, row } = posToCell(e.clientX - rect.left, e.clientY - rect.top);
		if (e.button === 0) {
			dragMode = 'increment';
			sequencerState.toggleCell(col, row);
		} else if (e.button === 2) {
			dragMode = 'clear';
			sequencerState.clearCell(col, row);
		}
	}

	function handleGridMouseMove(e: MouseEvent) {
		if (!gridAreaRef) return;
		const rect = gridAreaRef.getBoundingClientRect();
		const { col, row } = posToCell(e.clientX - rect.left, e.clientY - rect.top);
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

<svelte:window onmouseup={() => { handleMouseUp(); handleSliderMouseUp(); }} />

<div
	class="flex h-full items-center justify-center py-8"
	onmousemove={handleSliderMouseMove}
	role="application"
>
	<div class="flex flex-col gap-2">
		<!-- Octave sliders -->
		<div
			class="relative cursor-pointer"
			style="height: {SLIDER_HEIGHT}px; width: {TOTAL_WIDTH}px;"
			bind:this={sliderAreaRef}
			onmousedown={handleSliderAreaMouseDown}
			onmouseenter={(e) => {
				const rect = sliderAreaRef?.getBoundingClientRect();
				if (rect) hoveredSlider = xToColumn(e.clientX - rect.left);
			}}
			onmousemove={(e) => {
				const rect = sliderAreaRef?.getBoundingClientRect();
				if (rect) hoveredSlider = xToColumn(e.clientX - rect.left);
			}}
			onmouseleave={() => (hoveredSlider = null)}
			role="group"
			aria-label="Octave sliders"
		>
			<!-- SVG for gridlines -->
			<svg class="absolute inset-0 pointer-events-none" style="width: {TOTAL_WIDTH}px; height: {SLIDER_HEIGHT}px;">
				<!-- Horizontal gridlines -->
				{#each { length: POSITIONS } as _, pos}
					<line
						x1={0}
						y1={getKnobCenterY(pos as OctaveValue)}
						x2={TOTAL_WIDTH}
						y2={getKnobCenterY(pos as OctaveValue)}
						stroke="#374151"
						stroke-width="2"
					/>
				{/each}
			</svg>
			<!-- Knobs -->
			<div class="grid gap-1 pointer-events-none" style="grid-template-columns: repeat(8, 1fr);">
				{#each { length: 8 } as _, col}
					<div
						class="relative flex justify-center"
						style="height: {SLIDER_HEIGHT}px; width: 2rem;"
					>
						<div
							class="absolute rounded"
							style="width: {KNOB_SIZE}px; height: {KNOB_SIZE}px; top: {getKnobY(sequencerState.getOctave(col))}px; left: 50%; transform: translateX(-50%); background-color: {hoveredSlider === col ? '#6b7280' : '#4b5563'};"
						></div>
					</div>
				{/each}
			</div>
		</div>
		<!-- Sequencer grid -->
		<div
			class="relative cursor-pointer"
			style="width: {TOTAL_WIDTH}px; height: {TOTAL_HEIGHT}px;"
			bind:this={gridAreaRef}
			onmousedown={handleGridMouseDown}
			onmousemove={handleGridMouseMove}
			onmouseleave={() => (hoveredCell = null)}
			oncontextmenu={handleContextMenu}
			role="grid"
			aria-label="Sequencer grid"
		>
			<div class="grid gap-1 pointer-events-none" style="grid-template-columns: repeat(8, 1fr);">
				{#each { length: 16 } as _, row}
				{#each { length: 8 } as _, col}
					<div
						class="aspect-square w-8 rounded"
						style="background-color: {getCellColor(sequencerState.getCell(col, row), isHovered(col, row))}"
						aria-label="Step {row + 1}, track {col + 1}, value {sequencerState.getCell(col, row)}"
					></div>
				{/each}
			{/each}
			</div>
		</div>
	</div>
</div>
