<script lang="ts">
	import { sequencerState, TRACKS, BARS, TRACK_NAMES, TRACK_GROUPS, type CellValue } from '$lib/stores/sequencer.svelte';
	import { musicState } from '$lib/stores/music.svelte';

	let hoveredCell: { bar: number; track: number; beat: number } | null = $state(null);
	let dragMode: 'none' | 'increment' | 'clear' = $state('none');
	let gridAreaRefs: (HTMLElement | null)[] = $state(Array(BARS).fill(null));
	let lastCell: string | null = $state(null);

	const CELL_WIDTH = 14;
	const CELL_HEIGHT = 22;
	const GAP = 3;
	const LABEL_WIDTH = 80;
	const BAR_GAP = 6;
	const ROW_GAP = 72;
	const BARS_PER_ROW = 2;

	const numRows = Math.ceil(BARS / BARS_PER_ROW);

	const cols = $derived(sequencerState.cols);
	const totalGridWidth = $derived(cols * CELL_WIDTH + (cols - 1) * GAP);
	const totalGridHeight = TRACKS * CELL_HEIGHT + (TRACKS - 1) * GAP;

	// Beat labeling logic
	// For /4 with 2-4 beats: label every 4 columns (quarter notes)
	// For /4 with 5+ beats: label every 2 columns (quarter notes)
	// For /8: label every column
	const labelInterval = $derived(
		musicState.timeSignatureBottom === 4
			? musicState.timeSignatureTop <= 4 ? 4 : 2
			: 1
	);

	function getBeatLabel(col: number): string | null {
		if (musicState.timeSignatureBottom === 4) {
			if (musicState.timeSignatureTop <= 4) {
				// 16th note resolution: label every 4 cols (quarter) and every 2 cols (8th with "&")
				if (col % 4 === 0) {
					return String((col / 4) + 1);
				} else if (col % 2 === 0) {
					return '&';
				}
				return null;
			} else {
				// 8th note resolution: label every 2 cols (quarter) and odd cols (8th with "&")
				if (col % 2 === 0) {
					return String((col / 2) + 1);
				} else {
					return '&';
				}
			}
		} else {
			// /8 time (compound meter): dotted quarter note beats (every 3 8th notes)
			if (col % 3 === 0) {
				return String((col / 3) + 1);
			}
			return null;
		}
	}

	// Resize grid when time signature changes
	$effect(() => {
		const targetCols = sequencerState.getColsFromTimeSignature();
		sequencerState.resizeGrid(targetCols);
	});

	function xToBeat(x: number): number {
		const beat = Math.floor((x / totalGridWidth) * cols);
		return Math.max(0, Math.min(cols - 1, beat));
	}

	// Convert y position to track index (accounting for reversed display order)
	// Visual top = Melody 2 (track 5), Visual bottom = Bass (track 0)
	function yToTrack(y: number): number {
		const visualRow = Math.floor((y / totalGridHeight) * TRACKS);
		const clampedVisualRow = Math.max(0, Math.min(TRACKS - 1, visualRow));
		// Reverse: visual row 0 (top) = track TRACKS-1, visual row TRACKS-1 (bottom) = track 0
		return TRACKS - 1 - clampedVisualRow;
	}

	function posToCell(x: number, y: number): { track: number; beat: number } {
		return { track: yToTrack(y), beat: xToBeat(x) };
	}

	function getCellColor(value: CellValue, hover: boolean): string {
		if (value === 0) return hover ? '#4b5563' : '#374151';
		return hover ? `var(--degree-${value}-hover)` : `var(--degree-${value})`;
	}

	function isHovered(bar: number, track: number, beat: number): boolean {
		return hoveredCell?.bar === bar && hoveredCell?.track === track && hoveredCell?.beat === beat;
	}

	function handleGridMouseDown(bar: number, e: MouseEvent) {
		const ref = gridAreaRefs[bar];
		if (!ref) return;
		const rect = ref.getBoundingClientRect();
		const { track, beat } = posToCell(e.clientX - rect.left, e.clientY - rect.top);
		const cellKey = `${bar},${track},${beat}`;
		lastCell = cellKey;
		if (e.button === 0) {
			dragMode = 'increment';
			sequencerState.toggleCell(bar, track, beat);
		} else if (e.button === 2) {
			dragMode = 'clear';
			sequencerState.clearCell(bar, track, beat);
		}
	}

	function handleGridMouseMove(bar: number, e: MouseEvent) {
		const ref = gridAreaRefs[bar];
		if (!ref) return;
		const rect = ref.getBoundingClientRect();
		const { track, beat } = posToCell(e.clientX - rect.left, e.clientY - rect.top);
		hoveredCell = { bar, track, beat };
		const cellKey = `${bar},${track},${beat}`;
		if (cellKey === lastCell) return;
		lastCell = cellKey;
		if (dragMode === 'increment') {
			sequencerState.toggleCell(bar, track, beat);
		} else if (dragMode === 'clear') {
			sequencerState.clearCell(bar, track, beat);
		}
	}

	function handleMouseUp() {
		dragMode = 'none';
		lastCell = null;
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
	}

	// Get track index for display (reversed: melody at top, bass at bottom)
	function displayTrackIndex(visualIndex: number): number {
		return TRACKS - 1 - visualIndex;
	}
</script>

<svelte:window onmouseup={handleMouseUp} />

<div class="flex h-full items-center justify-center" role="application">
	<div class="flex flex-col" style="gap: {ROW_GAP}px;">
		{#each { length: numRows } as _, row}
			<div class="flex" style="gap: {BAR_GAP}px;">
				<!-- Track labels (only on first bar of each row) -->
				<div class="flex flex-col pt-5" style="width: {LABEL_WIDTH}px;">
					{#each TRACK_GROUPS as group}
						{@const groupHeight = group.count * CELL_HEIGHT + (group.count - 1) * GAP}
						<div class="flex items-center" style="height: {groupHeight}px;">
							<div class="flex items-center justify-end pr-2 text-xs select-none flex-1" style="color: #4b5563;">
								{group.label}
							</div>
							<div class="w-0.5 h-full rounded-full" style="background-color: #4b5563;"></div>
						</div>
						{#if group !== TRACK_GROUPS[TRACK_GROUPS.length - 1]}
							<div style="height: {GAP}px;"></div>
						{/if}
					{/each}
				</div>

				<!-- Bars in this row -->
				{#each { length: BARS_PER_ROW } as _, barInRow}
					{@const bar = row * BARS_PER_ROW + barInRow}
					{#if bar < BARS}
						<div class="flex flex-col gap-1">
							<!-- Beat labels -->
							<div class="flex" style="width: {totalGridWidth}px; gap: {GAP}px;">
								{#each { length: cols } as _, col}
									<div
										class="flex items-center justify-center text-xs select-none"
										style="width: {CELL_WIDTH}px; color: #4b5563;"
									>
										{getBeatLabel(col) ?? ''}
									</div>
								{/each}
							</div>

							<!-- Sequencer grid -->
							<div
								class="relative cursor-pointer"
								style="width: {totalGridWidth}px; height: {totalGridHeight}px;"
								bind:this={gridAreaRefs[bar]}
								onmousedown={(e) => handleGridMouseDown(bar, e)}
								onmousemove={(e) => handleGridMouseMove(bar, e)}
								onmouseleave={() => (hoveredCell = null)}
								oncontextmenu={handleContextMenu}
								role="grid"
								tabindex="0"
								aria-label="Sequencer grid bar {bar + 1}"
							>
								<div class="grid pointer-events-none" style="grid-template-columns: repeat({cols}, 1fr); gap: {GAP}px;">
									{#each { length: TRACKS } as _, visualTrack}
										{@const trackIndex = displayTrackIndex(visualTrack)}
										{#each { length: cols } as _, beat}
											<div
												class="rounded"
												style="width: {CELL_WIDTH}px; height: {CELL_HEIGHT}px; background-color: {getCellColor(sequencerState.getCell(bar, trackIndex, beat), isHovered(bar, trackIndex, beat))}"
												aria-label="Bar {bar + 1}, track {TRACK_NAMES[trackIndex]}, beat {beat + 1}, value {sequencerState.getCell(bar, trackIndex, beat)}"
											></div>
										{/each}
									{/each}
								</div>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
</div>
