/**
 * Format note names with proper music symbols.
 * Converts ASCII accidentals to Unicode: # → ♯, b → ♭
 */
export function formatNote(note: string): string {
	return note.replace('#', '♯').replace(/([A-Ga-g])b/g, '$1♭');
}

/**
 * Convert formatted note/chord names back to Tonal notation.
 * Converts Unicode accidentals to ASCII: ♯ → #, ♭ → b, ° → dim
 */
export function unformatNote(note: string): string {
	return note.replace('♯', '#').replace('♭', 'b').replace('°', 'dim');
}

/**
 * Get CSS variable for a scale degree (1-7).
 * Returns fallback color for null/undefined degrees.
 */
export function getDegreeColor(degree: number | null, fallback = '#1f2937'): string {
	return degree ? `var(--degree-${degree})` : fallback;
}
