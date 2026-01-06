import * as Tone from 'tone';

/**
 * Singleton service for audio playback using Tone.js piano sampler.
 * All methods handle note triggering, mute state, and sampler initialization.
 */
export class AudioService {
	private static _instance: AudioService | null = null;

	private playingNotes = new Set<string>();
	private muted = true;
	private sampler: Tone.Sampler | null = null;

	private constructor() {}

	static get instance(): AudioService {
		if (!AudioService._instance) {
			AudioService._instance = new AudioService();
		}
		return AudioService._instance;
	}

	/**
	 * Set mute state. When muting, stops all currently playing notes.
	 */
	setMuted(value: boolean): void {
		if (value) {
			this.stopAllNotes();
		}
		this.muted = value;
	}

	/**
	 * Check if audio is currently muted.
	 */
	isMuted(): boolean {
		return this.muted;
	}

	/**
	 * Initialize the audio context and sampler.
	 * Must be called from a user gesture (click, keydown) due to browser autoplay policy.
	 */
	private async ensureAudioReady(): Promise<void> {
		if (Tone.getContext().state !== 'running') {
			await Tone.start();
		}

		if (!this.sampler) {
			await new Promise<void>((resolve) => {
				this.sampler = new Tone.Sampler({
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

				this.sampler.volume.value = -6;
			});
		}
	}

	/**
	 * Convert note name and octave to Tone.js format (e.g., "C#", 4 -> "C#4")
	 */
	private formatNote(note: string, octave: number): string {
		const normalized = note.replace('♯', '#').replace('♭', 'b');
		return `${normalized}${octave}`;
	}

	/**
	 * Play a single note.
	 * @param note - Note name (e.g., "C", "F#", "Bb")
	 * @param octave - Octave number (e.g., 4)
	 */
	async playNote(note: string, octave: number): Promise<void> {
		if (this.muted) return;
		await this.ensureAudioReady();
		if (!this.sampler) return;

		const noteStr = this.formatNote(note, octave);

		if (this.playingNotes.has(noteStr)) return;

		this.playingNotes.add(noteStr);
		this.sampler.triggerAttack(noteStr, Tone.now());
	}

	/**
	 * Stop a single note.
	 * @param note - Note name (e.g., "C", "F#", "Bb")
	 * @param octave - Octave number (e.g., 4)
	 */
	stopNote(note: string, octave: number): void {
		if (!this.sampler) return;

		const noteStr = this.formatNote(note, octave);

		if (this.playingNotes.has(noteStr)) {
			this.playingNotes.delete(noteStr);
			this.sampler.triggerRelease(noteStr, Tone.now());
		}
	}

	/**
	 * Play multiple notes simultaneously (for chords).
	 * @param notes - Array of {note, octave} objects
	 */
	async playNotes(notes: Array<{ note: string; octave: number }>): Promise<void> {
		if (this.muted) return;
		await this.ensureAudioReady();
		if (!this.sampler) return;

		const noteStrings = notes.map((n) => this.formatNote(n.note, n.octave));
		const newNotes = noteStrings.filter((n) => !this.playingNotes.has(n));

		if (newNotes.length > 0) {
			newNotes.forEach((n) => this.playingNotes.add(n));
			this.sampler.triggerAttack(newNotes, Tone.now());
		}
	}

	/**
	 * Stop multiple notes.
	 * @param notes - Array of {note, octave} objects
	 */
	stopNotes(notes: Array<{ note: string; octave: number }>): void {
		if (!this.sampler) return;

		const noteStrings = notes.map((n) => this.formatNote(n.note, n.octave));
		const notesToStop = noteStrings.filter((n) => this.playingNotes.has(n));

		if (notesToStop.length > 0) {
			notesToStop.forEach((n) => this.playingNotes.delete(n));
			this.sampler.triggerRelease(notesToStop, Tone.now());
		}
	}

	/**
	 * Stop all currently playing notes.
	 */
	stopAllNotes(): void {
		if (!this.sampler) return;

		if (this.playingNotes.size > 0) {
			this.sampler.triggerRelease(Array.from(this.playingNotes), Tone.now());
			this.playingNotes.clear();
		}
	}
}
