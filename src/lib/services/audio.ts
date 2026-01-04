import * as Tone from 'tone';

// Track currently playing notes to handle start/stop correctly
const playingNotes = new Set<string>();

// Mute state - muted by default
let muted = true;

/**
 * Set mute state. When muting, stops all currently playing notes.
 */
export function setMuted(value: boolean): void {
	if (value) {
		stopAllNotes();
	}
	muted = value;
}

/**
 * Check if audio is currently muted.
 */
export function isMuted(): boolean {
	return muted;
}

// Lazy-initialized sampler (created on first user interaction)
let sampler: Tone.Sampler | null = null;

/**
 * Initialize the audio context and sampler.
 * Must be called from a user gesture (click, keydown) due to browser autoplay policy.
 */
async function ensureAudioReady(): Promise<void> {
	if (Tone.getContext().state !== 'running') {
		await Tone.start();
	}

	if (!sampler) {
		// Create a promise that resolves when samples are loaded
		await new Promise<void>((resolve) => {
			sampler = new Tone.Sampler({
				urls: {
					A0: 'A0.mp3',
					C1: 'C1.mp3',
					'D#1': 'Ds1.mp3',
					'F#1': 'Fs1.mp3',
					A1: 'A1.mp3',
					C2: 'C2.mp3',
					'D#2': 'Ds2.mp3',
					'F#2': 'Fs2.mp3',
					A2: 'A2.mp3',
					C3: 'C3.mp3',
					'D#3': 'Ds3.mp3',
					'F#3': 'Fs3.mp3',
					A3: 'A3.mp3',
					C4: 'C4.mp3',
					'D#4': 'Ds4.mp3',
					'F#4': 'Fs4.mp3',
					A4: 'A4.mp3',
					C5: 'C5.mp3',
					'D#5': 'Ds5.mp3',
					'F#5': 'Fs5.mp3',
					A5: 'A5.mp3',
					C6: 'C6.mp3',
					'D#6': 'Ds6.mp3',
					'F#6': 'Fs6.mp3',
					A6: 'A6.mp3',
					C7: 'C7.mp3',
					'D#7': 'Ds7.mp3',
					'F#7': 'Fs7.mp3',
					A7: 'A7.mp3',
					C8: 'C8.mp3'
				},
				release: 1,
				baseUrl: 'https://tonejs.github.io/audio/salamander/',
				onload: () => {
					resolve();
				}
			}).toDestination();

			sampler.volume.value = -6;
		});
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
	if (muted) return;
	await ensureAudioReady();
	if (!sampler) return;

	const noteStr = formatNote(note, octave);

	// Avoid re-triggering if already playing
	if (playingNotes.has(noteStr)) return;

	playingNotes.add(noteStr);
	sampler.triggerAttack(noteStr, Tone.now());
}

/**
 * Stop a single note.
 * @param note - Note name (e.g., "C", "F#", "Bb")
 * @param octave - Octave number (e.g., 4)
 */
export function stopNote(note: string, octave: number): void {
	if (!sampler) return;

	const noteStr = formatNote(note, octave);

	if (playingNotes.has(noteStr)) {
		playingNotes.delete(noteStr);
		sampler.triggerRelease(noteStr, Tone.now());
	}
}

/**
 * Play multiple notes simultaneously (for chords).
 * @param notes - Array of {note, octave} objects
 */
export async function playNotes(notes: Array<{ note: string; octave: number }>): Promise<void> {
	if (muted) return;
	await ensureAudioReady();
	if (!sampler) return;

	const noteStrings = notes.map((n) => formatNote(n.note, n.octave));

	// Filter out notes that are already playing
	const newNotes = noteStrings.filter((n) => !playingNotes.has(n));

	if (newNotes.length > 0) {
		newNotes.forEach((n) => playingNotes.add(n));
		sampler.triggerAttack(newNotes, Tone.now());
	}
}

/**
 * Stop multiple notes.
 * @param notes - Array of {note, octave} objects
 */
export function stopNotes(notes: Array<{ note: string; octave: number }>): void {
	if (!sampler) return;

	const noteStrings = notes.map((n) => formatNote(n.note, n.octave));
	const notesToStop = noteStrings.filter((n) => playingNotes.has(n));

	if (notesToStop.length > 0) {
		notesToStop.forEach((n) => playingNotes.delete(n));
		sampler.triggerRelease(notesToStop, Tone.now());
	}
}

/**
 * Stop all currently playing notes.
 */
export function stopAllNotes(): void {
	if (!sampler) return;

	if (playingNotes.size > 0) {
		sampler.triggerRelease(Array.from(playingNotes), Tone.now());
		playingNotes.clear();
	}
}
