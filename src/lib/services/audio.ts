import * as Tone from 'tone';

// Track currently playing notes to handle start/stop correctly
const playingNotes = new Set<string>();

// Lazy-initialized synth (created on first user interaction)
let synth: Tone.PolySynth | null = null;

/**
 * Initialize the audio context and synth.
 * Must be called from a user gesture (click, keydown) due to browser autoplay policy.
 */
async function ensureAudioReady(): Promise<void> {
	if (Tone.getContext().state !== 'running') {
		await Tone.start();
	}

	if (!synth) {
		synth = new Tone.PolySynth(Tone.Synth, {
			oscillator: {
				type: 'triangle'
			},
			envelope: {
				attack: 0.02,
				decay: 0.3,
				sustain: 0.2,
				release: 0.8
			}
		}).toDestination();

		// Configure polyphony and volume
		synth.maxPolyphony = 16;
		synth.volume.value = -6;
	}
}

/**
 * Convert note name and octave to Tone.js format (e.g., "C#", 4 -> "C#4")
 */
function formatNote(note: string, octave: number): string {
	// Tone.js uses # for sharps, convert from ♯ if needed
	const normalized = note.replace('♯', '#').replace('♭', 'b');
	return `${normalized}${octave}`;
}

/**
 * Play a single note.
 * @param note - Note name (e.g., "C", "F#", "Bb")
 * @param octave - Octave number (e.g., 4)
 */
export async function playNote(note: string, octave: number): Promise<void> {
	await ensureAudioReady();
	if (!synth) return;

	const noteStr = formatNote(note, octave);

	// Avoid re-triggering if already playing
	if (playingNotes.has(noteStr)) return;

	playingNotes.add(noteStr);
	synth.triggerAttack(noteStr, Tone.now());
}

/**
 * Stop a single note.
 * @param note - Note name (e.g., "C", "F#", "Bb")
 * @param octave - Octave number (e.g., 4)
 */
export function stopNote(note: string, octave: number): void {
	if (!synth) return;

	const noteStr = formatNote(note, octave);

	if (playingNotes.has(noteStr)) {
		playingNotes.delete(noteStr);
		synth.triggerRelease(noteStr, Tone.now());
	}
}

/**
 * Play multiple notes simultaneously (for chords).
 * @param notes - Array of {note, octave} objects
 */
export async function playNotes(notes: Array<{ note: string; octave: number }>): Promise<void> {
	await ensureAudioReady();
	if (!synth) return;

	const noteStrings = notes.map((n) => formatNote(n.note, n.octave));

	// Filter out notes that are already playing
	const newNotes = noteStrings.filter((n) => !playingNotes.has(n));

	if (newNotes.length > 0) {
		newNotes.forEach((n) => playingNotes.add(n));
		synth.triggerAttack(newNotes, Tone.now());
	}
}

/**
 * Stop multiple notes.
 * @param notes - Array of {note, octave} objects
 */
export function stopNotes(notes: Array<{ note: string; octave: number }>): void {
	if (!synth) return;

	const noteStrings = notes.map((n) => formatNote(n.note, n.octave));
	const notesToStop = noteStrings.filter((n) => playingNotes.has(n));

	if (notesToStop.length > 0) {
		notesToStop.forEach((n) => playingNotes.delete(n));
		synth.triggerRelease(notesToStop, Tone.now());
	}
}

/**
 * Stop all currently playing notes.
 */
export function stopAllNotes(): void {
	if (!synth) return;

	if (playingNotes.size > 0) {
		synth.triggerRelease(Array.from(playingNotes), Tone.now());
		playingNotes.clear();
	}
}
