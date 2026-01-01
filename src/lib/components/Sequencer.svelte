<script lang="ts">
	import { sequencerState, COLS, COLUMN_OCTAVES, type CellValue } from '$lib/stores/sequencer.svelte';
	import { musicState } from '$lib/stores/music.svelte';

	let hoveredCell: { col: number; row: number } | null = $state(null);
	let dragMode: 'none' | 'increment' | 'clear' = $state('none');
	let gridAreaRef: HTMLElement | null = $state(null);
	let lastCell: string | null = $state(null);
	const COLUMN_WIDTH = 28; // w-7 = 1.75rem = 28px
	const ROW_HEIGHT = 14; // 50% of column width
	const GAP = 4; // gap-1 = 0.25rem = 4px
	const TOTAL_WIDTH = COLS * COLUMN_WIDTH + (COLS - 1) * GAP;
	const LABEL_WIDTH = 20; // Width for beat labels
	const rows = $derived(sequencerState.rows);
	const totalHeight = $derived(rows * ROW_HEIGHT + (rows - 1) * GAP);

	// Beat labeling logic
	// For /4 with 2-4 beats: label every 4 rows (16th notes, 4 per beat)
	// For /4 with 5+ beats: label every 2 rows (8th notes, 2 per beat)
	// For /8: label every row (8th notes, 1 per beat)
	const labelInterval = $derived(
		musicState.timeSignatureBottom === 4
			? musicState.timeSignatureTop <= 4 ? 4 : 2
			: 1
	);
	const beatsPerBar = $derived(musicState.timeSignatureTop);

	function getBeatLabel(row: number): string | null {
		if (row % labelInterval !== 0) return null;
		const beatIndex = row / labelInterval;
		return String((beatIndex % beatsPerBar) + 1);
	}

	// Resize grid when time signature changes
	// For /4 with 2-4 beats: 16th note rows (4 per beat × 2 bars)
	// For /4 with 5+ beats: 8th note rows (2 per beat × 2 bars)
	// For /8: 8th note rows (1 per beat × 2 bars)
	$effect(() => {
		let targetRows: number;
		if (musicState.timeSignatureBottom === 4) {
			if (musicState.timeSignatureTop <= 4) {
				targetRows = musicState.timeSignatureTop * 8; // 16th notes
			} else {
				targetRows = musicState.timeSignatureTop * 4; // 8th notes
			}
		} else {
			targetRows = musicState.timeSignatureTop * 2; // 8th notes
		}
		sequencerState.resizeGrid(targetRows);
	});

	// Group consecutive columns with the same octave
	type OctaveGroup = { octave: number; startCol: number; span: number };
	const octaveGroups: OctaveGroup[] = [];
	for (let i = 0; i < COLUMN_OCTAVES.length; i++) {
		const octave = COLUMN_OCTAVES[i];
		const lastGroup = octaveGroups[octaveGroups.length - 1];
		if (lastGroup && lastGroup.octave === octave) {
			lastGroup.span++;
		} else {
			octaveGroups.push({ octave, startCol: i, span: 1 });
		}
	}

	function getGroupWidth(span: number): number {
		return span * COLUMN_WIDTH + (span - 1) * GAP;
	}

	function xToColumn(x: number): number {
		const col = Math.floor((x / TOTAL_WIDTH) * COLS);
		return Math.max(0, Math.min(COLS - 1, col));
	}

	function yToRow(y: number): number {
		const row = Math.floor((y / totalHeight) * rows);
		return Math.max(0, Math.min(rows - 1, row));
	}

	function posToCell(x: number, y: number): { col: number; row: number } {
		return { col: xToColumn(x), row: yToRow(y) };
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
		const cellKey = `${col},${row}`;
		lastCell = cellKey;
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
		const cellKey = `${col},${row}`;
		if (cellKey === lastCell) return;
		lastCell = cellKey;
		if (dragMode === 'increment') {
			sequencerState.toggleCell(col, row);
		} else if (dragMode === 'clear') {
			sequencerState.clearCell(col, row);
		}
	}

	function handleMouseUp() {
		dragMode = 'none';
		lastCell = null;
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
	}
</script>

<svelte:window onmouseup={handleMouseUp} />

<div
	class="flex h-full items-center justify-center py-8"
	role="application"
>
	<div class="flex gap-2">
		<!-- Beat labels column -->
		<div class="flex flex-col gap-1 pt-5" style="width: {LABEL_WIDTH}px;">
			{#each { length: rows } as _, row}
				<div
					class="flex items-center justify-end text-gray-500 text-xs select-none"
					style="height: {ROW_HEIGHT}px;"
				>
					{getBeatLabel(row) ?? ''}
				</div>
			{/each}
		</div>
		<!-- Grid section -->
		<div class="flex flex-col gap-1">
			<!-- Octave indicators -->
			<div class="flex" style="width: {TOTAL_WIDTH}px;">
				{#each octaveGroups as group, i}
					<div class="flex flex-col items-center" style="width: {getGroupWidth(group.span)}px; margin-right: {i < octaveGroups.length - 1 ? GAP : 0}px;">
						<span class="text-gray-500 text-xs select-none">{group.octave}</span>
						<div class="w-full border-b border-gray-500"></div>
					</div>
				{/each}
			</div>
			<!-- Sequencer grid -->
			<div
				class="relative cursor-pointer"
				style="width: {TOTAL_WIDTH}px; height: {totalHeight}px;"
				bind:this={gridAreaRef}
				onmousedown={handleGridMouseDown}
				onmousemove={handleGridMouseMove}
				onmouseleave={() => (hoveredCell = null)}
				oncontextmenu={handleContextMenu}
				role="grid"
				tabindex="0"
				aria-label="Sequencer grid"
			>
				<div class="grid gap-1 pointer-events-none" style="grid-template-columns: repeat({COLS}, 1fr);">
					{#each { length: rows } as _, row}
					{#each { length: COLS } as _, col}
						<div
							class="w-7 rounded"
							style="height: {ROW_HEIGHT}px; background-color: {getCellColor(sequencerState.getCell(col, row), isHovered(col, row))}"
							aria-label="Step {row + 1}, track {col + 1}, value {sequencerState.getCell(col, row)}"
						></div>
					{/each}
				{/each}
				</div>
			</div>
		</div>
	</div>
</div>
