/**
 * MIDI State Store
 *
 * Handles Web MIDI API integration for both input and output:
 * - Device enumeration and selection
 * - MIDI input handling (from external controllers)
 * - MIDI output (to external synthesizers)
 *
 * Architecture notes:
 * - Subscribes to note-events for MIDI output (decoupled from appState)
 * - Uses callbacks for MIDI input to avoid circular dependency with appState
 * - Initialize must be called explicitly from app root (onMount in +layout.svelte)
 *
 * MIDI IN flow:
 *   External controller -> handleMidiMessage -> onMidiNoteOn callback -> appState
 *   (MIDI IN does NOT echo back to MIDI OUT to prevent feedback loops)
 *
 * MIDI OUT flow:
 *   appState.addPressedNote -> publishNoteOn -> handleNoteEvent -> sendNoteOn
 */

import { SvelteMap } from 'svelte/reactivity';
import { subscribeToNoteEvents, type NoteEvent } from '$lib/events/note-events';

// Callback for MIDI input events - set by external code to avoid circular dependency
let onMidiNoteOn: ((note: string, octave: number) => void) | null = null;
let onMidiNoteOff: ((note: string, octave: number) => void) | null = null;

// MIDI note names for conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// State
let midiAccess: MIDIAccess | null = $state(null);
let availableInputs: MIDIInput[] = $state([]);
let availableOutputs: MIDIOutput[] = $state([]);
let selectedInputId: string | null = $state(null);
let selectedOutputId: string | null = $state(null);
const isSupported = $state(typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator);
let isInputMenuOpen = $state(false);
let isOutputMenuOpen = $state(false);
let initError: string | null = $state(null);
let initialized = false;

// Track which MIDI notes are currently pressed (to handle note-off correctly)
const pressedMidiNotes = new SvelteMap<number, { note: string; octave: number }>();

/** Convert MIDI note number to note name and octave */
function midiNoteToNoteInfo(midiNote: number): { note: string; octave: number } {
	const note = NOTE_NAMES[midiNote % 12];
	const octave = Math.floor(midiNote / 12) - 1;
	return { note, octave };
}

/** Convert note name and octave to MIDI note number */
function noteInfoToMidiNote(note: string, octave: number): number {
	const normalizedNote = note.replace('♯', '#').replace('♭', 'b');
	// Handle flats by converting to sharps
	const flatToSharp: Record<string, string> = {
		Db: 'C#',
		Eb: 'D#',
		Fb: 'E',
		Gb: 'F#',
		Ab: 'G#',
		Bb: 'A#',
		Cb: 'B'
	};
	const sharpNote = flatToSharp[normalizedNote] ?? normalizedNote;
	const noteIndex = NOTE_NAMES.indexOf(sharpNote);
	if (noteIndex === -1) return 60; // Default to middle C if note not found
	return (octave + 1) * 12 + noteIndex;
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
		onMidiNoteOn?.(noteInfo.note, noteInfo.octave);
	} else if (isNoteOff) {
		const noteInfo = pressedMidiNotes.get(noteNumber);
		if (noteInfo) {
			pressedMidiNotes.delete(noteNumber);
			onMidiNoteOff?.(noteInfo.note, noteInfo.octave);
		}
	}
}

/** Update the list of available inputs and outputs from MIDIAccess */
function updateDevices(autoConnect: boolean = false): void {
	if (!midiAccess) {
		availableInputs = [];
		availableOutputs = [];
		return;
	}

	// Update inputs
	const inputs: MIDIInput[] = [];
	midiAccess.inputs.forEach((input) => {
		inputs.push(input);
	});
	availableInputs = inputs;

	// Update outputs
	const outputs: MIDIOutput[] = [];
	midiAccess.outputs.forEach((output) => {
		outputs.push(output);
	});
	availableOutputs = outputs;

	// If selected input is no longer available, deselect it
	if (selectedInputId && !inputs.find((i) => i.id === selectedInputId)) {
		selectInput(null);
	}

	// If selected output is no longer available, deselect it
	if (selectedOutputId && !outputs.find((o) => o.id === selectedOutputId)) {
		selectOutput(null);
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
		onMidiNoteOff?.(noteInfo.note, noteInfo.octave);
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

/** Select a MIDI output device */
function selectOutput(outputId: string | null): void {
	selectedOutputId = outputId;
}

/** Send MIDI Note On message */
function sendNoteOn(note: string, octave: number, velocity: number = 80): void {
	if (!selectedOutputId || !midiAccess) return;
	const output = midiAccess.outputs.get(selectedOutputId);
	if (!output) return;

	const midiNote = noteInfoToMidiNote(note, octave);
	// Note On on channel 1: 0x90
	output.send([0x90, midiNote, velocity]);
}

/** Send MIDI Note Off message */
function sendNoteOff(note: string, octave: number): void {
	if (!selectedOutputId || !midiAccess) return;
	const output = midiAccess.outputs.get(selectedOutputId);
	if (!output) return;

	const midiNote = noteInfoToMidiNote(note, octave);
	// Note Off on channel 1: 0x80
	output.send([0x80, midiNote, 0]);
}

/** Handle note events from the app (for MIDI output) */
function handleNoteEvent(event: NoteEvent): void {
	if (event.type === 'note-on') {
		sendNoteOn(event.note, event.octave, event.velocity ?? 80);
	} else {
		sendNoteOff(event.note, event.octave);
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

	// Subscribe to note events for MIDI output
	subscribeToNoteEvents(handleNoteEvent);

	try {
		midiAccess = await navigator.requestMIDIAccess();
		initError = null;

		// Listen for device changes
		midiAccess.onstatechange = () => {
			updateDevices(false);
		};

		// Initial update with auto-connect enabled
		updateDevices(true);
	} catch (err) {
		initError = err instanceof Error ? err.message : 'Failed to access MIDI devices';
		midiAccess = null;
	}
}

// Note: MIDI initialization is now explicit - call midiState.initialize() from the app root

export const midiState = {
	get isSupported() {
		return isSupported;
	},
	get availableInputs() {
		return availableInputs;
	},
	get availableOutputs() {
		return availableOutputs;
	},
	get selectedInputId() {
		return selectedInputId;
	},
	get selectedOutputId() {
		return selectedOutputId;
	},
	get selectedInput(): MIDIInput | null {
		if (!selectedInputId || !midiAccess) return null;
		return midiAccess.inputs.get(selectedInputId) ?? null;
	},
	get selectedOutput(): MIDIOutput | null {
		if (!selectedOutputId || !midiAccess) return null;
		return midiAccess.outputs.get(selectedOutputId) ?? null;
	},
	get isInputConnected() {
		return selectedInputId !== null;
	},
	get isOutputConnected() {
		return selectedOutputId !== null;
	},
	get isInputMenuOpen() {
		return isInputMenuOpen;
	},
	set isInputMenuOpen(value: boolean) {
		isInputMenuOpen = value;
	},
	get isOutputMenuOpen() {
		return isOutputMenuOpen;
	},
	set isOutputMenuOpen(value: boolean) {
		isOutputMenuOpen = value;
	},
	get initError() {
		return initError;
	},

	initialize,
	selectInput,
	selectOutput,
	sendNoteOn,
	sendNoteOff,

	/**
	 * Set callbacks for MIDI input events.
	 * This allows decoupling from appState - the caller provides handlers
	 * that will be called when MIDI notes are received.
	 */
	setMidiInputHandlers(
		noteOnHandler: (note: string, octave: number) => void,
		noteOffHandler: (note: string, octave: number) => void
	): void {
		onMidiNoteOn = noteOnHandler;
		onMidiNoteOff = noteOffHandler;
	},

	toggleInputMenu(): void {
		isInputMenuOpen = !isInputMenuOpen;
		if (isInputMenuOpen) isOutputMenuOpen = false;
	},
	toggleOutputMenu(): void {
		isOutputMenuOpen = !isOutputMenuOpen;
		if (isOutputMenuOpen) isInputMenuOpen = false;
	}
};
