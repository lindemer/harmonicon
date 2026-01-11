/**
 * Modifier State Management
 *
 * Handles keyboard/mouse modifier keys (Shift, Alt, Tab, Ctrl)
 * with mutual exclusion rules and lifecycle callbacks.
 *
 * Modifier behavior:
 * - Shift: 2nd inversion (blocked by Ctrl)
 * - Alt: 1st inversion (blocked by Ctrl)
 * - Tab: 7th mode (blocked by Ctrl)
 * - Ctrl: 9th mode (blocks and clears all other modifiers)
 */

import { SvelteMap } from 'svelte/reactivity';
import { appState } from '$lib/stores/app.svelte';

export type ModifierName = 'shift' | 'alt' | 'tab' | 'ctrl';

interface ModifierConfig {
	name: ModifierName;
	blockedBy?: ModifierName[];
	clearsOnActivate?: ModifierName[];
	onActivate?: () => void;
	onDeactivate?: () => void;
}

class ModifierState {
	private keyboardPressed = $state(false);
	private mousePressed = $state(false);

	constructor(
		private config: ModifierConfig,
		private getModifier: (name: ModifierName) => ModifierState
	) {}

	get pressed(): boolean {
		return this.keyboardPressed || this.mousePressed;
	}

	private isBlocked(): boolean {
		if (!this.config.blockedBy) return false;
		return this.config.blockedBy.some((name) => this.getModifier(name).pressed);
	}

	private clearConflicting(): void {
		if (!this.config.clearsOnActivate) return;
		for (const name of this.config.clearsOnActivate) {
			this.getModifier(name).reset();
		}
	}

	setKeyboard(value: boolean): void {
		if (value && this.isBlocked()) return;
		if (value) this.clearConflicting();

		const wasPressedBefore = this.pressed;
		this.keyboardPressed = value;
		this.handleStateChange(wasPressedBefore);
	}

	setMouse(value: boolean): void {
		if (value && this.isBlocked()) return;
		if (value) this.clearConflicting();

		const wasPressedBefore = this.pressed;
		this.mousePressed = value;
		this.handleStateChange(wasPressedBefore);
	}

	private handleStateChange(wasPressedBefore: boolean): void {
		const isPressedNow = this.pressed;

		if (!wasPressedBefore && isPressedNow) {
			this.config.onActivate?.();
		} else if (wasPressedBefore && !isPressedNow) {
			this.config.onDeactivate?.();
		}
	}

	reset(): void {
		const wasPressedBefore = this.pressed;
		this.keyboardPressed = false;
		this.mousePressed = false;
		if (wasPressedBefore) {
			this.config.onDeactivate?.();
		}
	}
}

// Modifier state instances
const modifiers = new SvelteMap<ModifierName, ModifierState>();

function getModifier(name: ModifierName): ModifierState {
	return modifiers.get(name)!;
}

// Initialize modifiers with their configurations
modifiers.set(
	'shift',
	new ModifierState(
		{
			name: 'shift',
			blockedBy: ['ctrl']
		},
		getModifier
	)
);

modifiers.set(
	'alt',
	new ModifierState(
		{
			name: 'alt',
			blockedBy: ['ctrl']
		},
		getModifier
	)
);

modifiers.set(
	'tab',
	new ModifierState(
		{
			name: 'tab',
			blockedBy: ['ctrl'],
			onActivate: () => {
				appState.isSeventhMode = true;
			},
			onDeactivate: () => {
				appState.isSeventhMode = false;
			}
		},
		getModifier
	)
);

modifiers.set(
	'ctrl',
	new ModifierState(
		{
			name: 'ctrl',
			blockedBy: ['shift', 'alt', 'tab'],
			clearsOnActivate: ['shift', 'alt', 'tab'],
			onActivate: () => {
				appState.isNinthMode = true;
			},
			onDeactivate: () => {
				appState.isNinthMode = false;
			}
		},
		getModifier
	)
);

/** Exported modifier state accessors */
export const modifierState = {
	get shiftPressed() {
		return getModifier('shift').pressed;
	},
	get altPressed() {
		return getModifier('alt').pressed;
	},
	get tabPressed() {
		return getModifier('tab').pressed;
	},
	get ctrlPressed() {
		return getModifier('ctrl').pressed;
	},

	// Keyboard setters
	setShiftKeyboard(value: boolean) {
		getModifier('shift').setKeyboard(value);
	},
	setAltKeyboard(value: boolean) {
		getModifier('alt').setKeyboard(value);
	},
	setTabKeyboard(value: boolean) {
		getModifier('tab').setKeyboard(value);
	},
	setCtrlKeyboard(value: boolean) {
		getModifier('ctrl').setKeyboard(value);
	},

	// Mouse setters
	setShiftMouse(value: boolean) {
		getModifier('shift').setMouse(value);
	},
	setAltMouse(value: boolean) {
		getModifier('alt').setMouse(value);
	},
	setTabMouse(value: boolean) {
		getModifier('tab').setMouse(value);
	},
	setCtrlMouse(value: boolean) {
		getModifier('ctrl').setMouse(value);
	},

	/**
	 * Calculate inversion based on current modifier state.
	 * In 9th mode: always 0 (no inversions)
	 * In 7th mode: Alt=1st, Shift=2nd, Alt+Shift=3rd
	 * In triad mode: Alt=1st, Shift=2nd, Alt+Shift=2nd
	 */
	get inversion(): 0 | 1 | 2 | 3 {
		// 9th mode has no inversions
		if (getModifier('ctrl').pressed) return 0;

		const shift = getModifier('shift').pressed;
		const alt = getModifier('alt').pressed;
		const seventh = getModifier('tab').pressed;

		if (shift && alt) {
			// Both pressed: 3rd inversion in 7th mode, 2nd inversion otherwise
			return seventh ? 3 : 2;
		}
		if (shift) return 2; // Shift alone = 2nd
		if (alt) return 1; // Alt alone = 1st
		return 0;
	},

	/** Reset all modifiers */
	resetAll() {
		for (const modifier of modifiers.values()) {
			modifier.reset();
		}
	}
};
