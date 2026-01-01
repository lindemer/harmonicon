export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const COLS = 13;

// Octave mapping for each column: [1, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 7]
export const COLUMN_OCTAVES = [1, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 7] as const;

// Create initial grid with given number of rows
function createEmptyGrid(rows: number): CellValue[][] {
	return Array(COLS)
		.fill(null)
		.map(() => Array(rows).fill(0) as CellValue[]);
}

// Initial row count based on default 4/4 time
const INITIAL_ROWS = 16;
let grid = $state<CellValue[][]>(createEmptyGrid(INITIAL_ROWS));
let currentRows = $state(INITIAL_ROWS);

export const sequencerState = {
	get grid() {
		return grid;
	},

	get rows() {
		return currentRows;
	},

	getCell(col: number, row: number): CellValue {
		return grid[col]?.[row] ?? 0;
	},

	toggleCell(col: number, row: number): void {
		if (col < 0 || col >= COLS || row < 0 || row >= currentRows) return;
		grid[col][row] = ((grid[col][row] + 1) % 8) as CellValue;
	},

	clearCell(col: number, row: number): void {
		if (col < 0 || col >= COLS || row < 0 || row >= currentRows) return;
		grid[col][row] = 0;
	},

	resizeGrid(newRows: number): void {
		if (newRows === currentRows) return;
		grid = grid.map((col) => {
			if (newRows > currentRows) {
				return [...col, ...Array(newRows - currentRows).fill(0)] as CellValue[];
			} else {
				return col.slice(0, newRows) as CellValue[];
			}
		});
		currentRows = newRows;
	},

	clearGrid(): void {
		grid = createEmptyGrid(currentRows);
	}
};
