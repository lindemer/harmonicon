import { musicState } from './music.svelte';

export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TRACKS = 6;
export const BARS = 4;
export const TRACK_NAMES = [
	'Bass',
	'Harmony 1',
	'Harmony 2',
	'Harmony 3',
	'Melody 1',
	'Melody 2'
] as const;

// Track groups for display (label appears once, vertical bar shows span)
export const TRACK_GROUPS = [
	{ label: 'Melody', startTrack: 4, count: 2 },
	{ label: 'Harmony', startTrack: 1, count: 3 },
	{ label: 'Bass', startTrack: 0, count: 1 }
] as const;

// Calculate columns per bar based on time signature
function getColsPerBar(timeSignatureTop: number, timeSignatureBottom: number): number {
	if (timeSignatureBottom === 4) {
		// /4 time signatures
		if (timeSignatureTop <= 4) {
			// 2/4, 3/4, 4/4: 16th note resolution (4 per beat)
			return timeSignatureTop * 4;
		} else {
			// 5/4, 7/4: 8th note resolution (2 per beat)
			return timeSignatureTop * 2;
		}
	} else {
		// /8 time signatures: 8th note resolution (1 per beat)
		return timeSignatureTop;
	}
}

// Create initial 3D grid: grid[bar][track][beat]
function createEmptyGrid(colsPerBar: number): CellValue[][][] {
	return Array(BARS)
		.fill(null)
		.map(() =>
			Array(TRACKS)
				.fill(null)
				.map(() => Array(colsPerBar).fill(0) as CellValue[])
		);
}

// Initial columns based on default 4/4 time
const INITIAL_COLS = 16; // 4/4 = 4 beats × 4 subdivisions
let grid = $state<CellValue[][][]>(createEmptyGrid(INITIAL_COLS));
let currentCols = $state(INITIAL_COLS);

export const sequencerState = {
	get grid() {
		return grid;
	},

	get cols() {
		return currentCols;
	},

	getCell(bar: number, track: number, beat: number): CellValue {
		return grid[bar]?.[track]?.[beat] ?? 0;
	},

	toggleCell(bar: number, track: number, beat: number): void {
		if (bar < 0 || bar >= BARS || track < 0 || track >= TRACKS || beat < 0 || beat >= currentCols)
			return;
		grid[bar][track][beat] = ((grid[bar][track][beat] + 1) % 8) as CellValue;
	},

	clearCell(bar: number, track: number, beat: number): void {
		if (bar < 0 || bar >= BARS || track < 0 || track >= TRACKS || beat < 0 || beat >= currentCols)
			return;
		grid[bar][track][beat] = 0;
	},

	resizeGrid(newCols: number): void {
		if (newCols === currentCols) return;
		grid = grid.map((bar) =>
			bar.map((track) => {
				if (newCols > currentCols) {
					return [...track, ...Array(newCols - currentCols).fill(0)] as CellValue[];
				} else {
					return track.slice(0, newCols) as CellValue[];
				}
			})
		);
		currentCols = newCols;
	},

	clearGrid(): void {
		grid = createEmptyGrid(currentCols);
	},

	// Helper to get the current columns per bar based on music state
	getColsFromTimeSignature(): number {
		return getColsPerBar(musicState.timeSignatureTop, musicState.timeSignatureBottom);
	}
};
