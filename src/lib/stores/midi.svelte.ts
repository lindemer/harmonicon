import { appState } from '$lib/stores/app.svelte';

// MIDI note names for conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// State
let midiAccess: MIDIAccess | null = $state(null);
let availableInputs: MIDIInput[] = $state([]);
let selectedInputId: string | null = $state(null);
let isSupported = $state(typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator);
let isMenuOpen = $state(false);
let initError: string | null = $state(null);
let initialized = false;

// Track which MIDI notes are currently pressed (to handle note-off correctly)
const pressedMidiNotes = new Map<number, { note: string; octave: number }>();

/** Convert MIDI note number to note name and octave */
function midiNoteToNoteInfo(midiNote: number): { note: string; octave: number } {
	const note = NOTE_NAMES[midiNote % 12];
	const octave = Math.floor(midiNote / 12) - 1;
	return { note, octave };
}

/** Handle incoming MIDI messages */
function handleMidiMessage(event: MIDIMessageEvent): void {
	const data = event.data;
	if (!data || data.length < 3) return;

	const status = data[0];
	const noteNumber = data[1];
	const velocity = data[2];

	// Note On: 0x90-0x9F (channel 1-16)
	// Note Off: 0x80-0x8F (channel 1-16) or Note On with velocity 0
	const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
	const isNoteOff = (status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0);

	if (isNoteOn) {
		const noteInfo = midiNoteToNoteInfo(noteNumber);
		pressedMidiNotes.set(noteNumber, noteInfo);
		appState.addPressedNote(noteInfo.note, noteInfo.octave);
	} else if (isNoteOff) {
		const noteInfo = pressedMidiNotes.get(noteNumber);
		if (noteInfo) {
			pressedMidiNotes.delete(noteNumber);
			appState.removePressedNote(noteInfo.note, noteInfo.octave);
		}
	}
}

/** Update the list of available inputs from MIDIAccess */
function updateInputs(autoConnect: boolean = false): void {
	if (!midiAccess) {
		availableInputs = [];
		return;
	}

	const inputs: MIDIInput[] = [];
	midiAccess.inputs.forEach((input) => {
		inputs.push(input);
	});
	availableInputs = inputs;

	// If selected input is no longer available, deselect it
	if (selectedInputId && !inputs.find((i) => i.id === selectedInputId)) {
		selectInput(null);
	}

	// Auto-connect if exactly one device and not already connected
	if (autoConnect && inputs.length === 1 && !selectedInputId) {
		selectInput(inputs[0].id);
	}
}

/** Select a MIDI input device */
function selectInput(inputId: string | null): void {
	// Disconnect from previous input
	if (selectedInputId && midiAccess) {
		const prevInput = midiAccess.inputs.get(selectedInputId);
		if (prevInput) {
			prevInput.onmidimessage = null;
		}
	}

	// Clear any hanging notes
	for (const [, noteInfo] of pressedMidiNotes) {
		appState.removePressedNote(noteInfo.note, noteInfo.octave);
	}
	pressedMidiNotes.clear();

	selectedInputId = inputId;

	// Connect to new input
	if (inputId && midiAccess) {
		const input = midiAccess.inputs.get(inputId);
		if (input) {
			input.onmidimessage = handleMidiMessage;
		}
	}
}

/** Initialize MIDI access */
async function initialize(): Promise<void> {
	if (initialized || !isSupported) {
		if (!isSupported) {
			initError = 'Web MIDI API is not supported in this browser';
		}
		return;
	}

	initialized = true;

	try {
		midiAccess = await navigator.requestMIDIAccess();
		initError = null;

		// Listen for device changes
		midiAccess.onstatechange = () => {
			updateInputs(false);
		};

		// Initial update with auto-connect enabled
		updateInputs(true);
	} catch (err) {
		initError = err instanceof Error ? err.message : 'Failed to access MIDI devices';
		midiAccess = null;
	}
}

// Auto-initialize on module load (browser only)
if (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) {
	initialize();
}

export const midiState = {
	get isSupported() {
		return isSupported;
	},
	get availableInputs() {
		return availableInputs;
	},
	get selectedInputId() {
		return selectedInputId;
	},
	get selectedInput(): MIDIInput | null {
		if (!selectedInputId || !midiAccess) return null;
		return midiAccess.inputs.get(selectedInputId) ?? null;
	},
	get isConnected() {
		return selectedInputId !== null;
	},
	get isMenuOpen() {
		return isMenuOpen;
	},
	set isMenuOpen(value: boolean) {
		isMenuOpen = value;
	},
	get initError() {
		return initError;
	},

	initialize,
	selectInput,

	toggleMenu(): void {
		isMenuOpen = !isMenuOpen;
	}
};
