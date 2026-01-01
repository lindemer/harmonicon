export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const COLS = 8;
const ROWS = 16;

// Create initial grid: 8 columns x 16 rows, all zeros
function createEmptyGrid(): CellValue[][] {
	return Array(COLS)
		.fill(null)
		.map(() => Array(ROWS).fill(0) as CellValue[]);
}

let grid = $state<CellValue[][]>(createEmptyGrid());

export const sequencerState = {
	get grid() {
		return grid;
	},

	getCell(col: number, row: number): CellValue {
		return grid[col]?.[row] ?? 0;
	},

	toggleCell(col: number, row: number): void {
		if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
		grid[col][row] = ((grid[col][row] + 1) % 8) as CellValue;
	},

	clearCell(col: number, row: number): void {
		if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
		grid[col][row] = 0;
	},

	clearGrid(): void {
		grid = createEmptyGrid();
	}
};
