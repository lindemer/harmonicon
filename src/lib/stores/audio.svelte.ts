/**
 * Internal audio module - only imported by app.svelte.ts
 * Handles Tone.js sampler and audio playback
 */
import { SvelteSet } from 'svelte/reactivity';
import * as Tone from 'tone';

// ============ Private State ============

let sampler: Tone.Sampler | null = null;
const playingNotes = new SvelteSet<string>();
let muted = $state(true);

// ============ Private Helpers ============

/** Convert note name and octave to Tone.js format (e.g., "C#", 4 -> "C#4") */
function formatNoteForTone(note: string, octave: number): string {
	const normalized = note.replace('♯', '#').replace('♭', 'b');
	return `${normalized}${octave}`;
}

/** Initialize the audio context and sampler. Must be called from a user gesture. */
async function ensureAudioReady(): Promise<void> {
	if (Tone.getContext().state !== 'running') {
		await Tone.start();
	}

	if (!sampler) {
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

// ============ Public API ============

export const audioState = {
	get muted() {
		return muted;
	},

	set muted(value: boolean) {
		muted = value;
	},

	async playNote(note: string, octave: number): Promise<void> {
		if (muted) return;
		await ensureAudioReady();
		if (!sampler) return;

		const noteStr = formatNoteForTone(note, octave);
		if (playingNotes.has(noteStr)) return;

		playingNotes.add(noteStr);
		sampler.triggerAttack(noteStr, Tone.now());
	},

	stopNote(note: string, octave: number): void {
		if (!sampler) return;

		const noteStr = formatNoteForTone(note, octave);
		if (playingNotes.has(noteStr)) {
			playingNotes.delete(noteStr);
			sampler.triggerRelease(noteStr, Tone.now());
		}
	},

	async playNotes(notes: Array<{ note: string; octave: number }>): Promise<void> {
		if (muted) return;
		await ensureAudioReady();
		if (!sampler) return;

		const noteStrings = notes.map((n) => formatNoteForTone(n.note, n.octave));
		const newNotes = noteStrings.filter((n) => !playingNotes.has(n));

		if (newNotes.length > 0) {
			newNotes.forEach((n) => playingNotes.add(n));
			sampler.triggerAttack(newNotes, Tone.now());
		}
	},

	stopNotes(notes: Array<{ note: string; octave: number }>): void {
		if (!sampler) return;

		const noteStrings = notes.map((n) => formatNoteForTone(n.note, n.octave));
		const notesToStop = noteStrings.filter((n) => playingNotes.has(n));

		if (notesToStop.length > 0) {
			notesToStop.forEach((n) => playingNotes.delete(n));
			sampler.triggerRelease(notesToStop, Tone.now());
		}
	},

	stopAllNotes(): void {
		if (!sampler) return;

		if (playingNotes.size > 0) {
			sampler.triggerRelease(Array.from(playingNotes), Tone.now());
			playingNotes.clear();
		}
	}
};
