<script lang="ts">
	import { Key, Chord, Note } from 'tonal';
	import { appState } from '$lib/stores/app.svelte';
	import { keyboardState } from '$lib/stores/keyboard.svelte';
	import { FormatUtil } from '$lib/utils/format.util';
	import { ChordUtil } from '$lib/utils/chord.util';
	import { GeometryUtil } from '$lib/utils/geometry.util';
	import { VoicingUtil } from '$lib/utils/voicing.util';
	import ChordDisplay from './Chord.svelte';

	const CIRCLE_DIMENSIONS = {
		viewBox: 440,
		center: { x: 220, y: 220 },
		radii: {
			outer: 185,
			mid: 135,
			inner: 95,
			center: 65
		},
		fontSizes: {
			major: 20,
			minor: 16,
			dim: 11
		},
		segmentAngle: 30,
		rotationOffset: -15,
		centerPadding: 5
	};

	type RingType = 'major' | 'minor' | 'dim';

	const CIRCLE_RINGS: Array<{ name: RingType; innerRadius: number; outerRadius: number }> = [
		{
			name: 'dim',
			innerRadius: CIRCLE_DIMENSIONS.radii.center,
			outerRadius: CIRCLE_DIMENSIONS.radii.inner
		},
		{
			name: 'minor',
			innerRadius: CIRCLE_DIMENSIONS.radii.inner,
			outerRadius: CIRCLE_DIMENSIONS.radii.mid
		},
		{
			name: 'major',
			innerRadius: CIRCLE_DIMENSIONS.radii.mid,
			outerRadius: CIRCLE_DIMENSIONS.radii.outer
		}
	];

	const { viewBox, center, radii, fontSizes, segmentAngle, rotationOffset, centerPadding } =
		CIRCLE_DIMENSIONS;
	const cx = center.x;
	const cy = center.y;

	function getChordRomanNumeral(): { numeral: string; isDiatonic: boolean } | null {
		const detected = appState.detectedChord;
		if (!detected) return null;
		const chordSymbol = FormatUtil.unformatNote(detected.symbol);
		return FormatUtil.getChordRomanNumeral(chordSymbol, appState.selectedRoot, appState.mode);
	}

	function getChordType(chordSymbol: string): 'ninth' | 'seventh' | 'triad' {
		if (chordSymbol.includes('9')) return 'ninth';
		if (chordSymbol.includes('7')) return 'seventh';
		return 'triad';
	}

	// Format chord symbol for slash notation display
	// Major: uppercase root only (C, G⁷, F⁷) - remove M, maj, etc.
	// Minor: uppercase root + superscript minus (A⁻, D⁻⁷, E⁻⁹)
	// Diminished: use degree symbol (B°, F♯°⁷)
	// 7th/9th: use superscript numbers
	// Alterations: ♭5, ♯5, ♭7, ♯7, ♭9, ♯9, no3, no5 in superscript
	function formatSlashChordSymbol(symbol: string): string {
		const formatted = FormatUtil.formatNote(symbol);

		// Extract root note and quality/extensions
		const match = formatted.match(/^([A-G][♯♭]?)(.*)$/);
		if (!match) return formatted;

		const root = match[1];
		let suffix = match[2];

		// Process suffix - handle quality first
		suffix = suffix
			// Remove 'M' for major chords (before 7, 9, add, sus, or end)
			.replace(/^M(?=7|9|add|sus|$)/, '')
			// Remove 'maj' before extensions
			.replace(/^maj(?=[79]|$)/, '')
			// Replace 'aug' with + (augmented)
			.replace(/aug/g, '+')
			// Replace 'dim' with degree symbol
			.replace(/dim/g, '°')
			// Replace 'm' (minor) with superscript minus (but not 'maj')
			.replace(/^m(?!aj)/, '⁻');

		// Match quality prefix and all extensions/alterations that should be superscripted
		// Extensions: 7, 9, b5, #5, b7, #7, b9, #9, no3, no5
		const extMatch = suffix.match(/^([⁻°]?)(.*)$/);
		if (extMatch && extMatch[2]) {
			const qualityPart = extMatch[1]; // e.g., '⁻' or '°' or ''
			let extPart = extMatch[2]; // e.g., '7', '9', '7b5', 'b9#5', etc.

			// Convert accidentals to symbols
			extPart = extPart.replace(/b/g, '♭').replace(/#/g, '♯');

			return root + qualityPart + '<sup>' + extPart + '</sup>';
		}

		return root + suffix;
	}

	// Build keys array from circle of fifths using Tonal
	const keys = FormatUtil.CIRCLE_OF_FIFTHS.map((root) => {
		const keyInfo = Key.majorKey(root);
		const relativeMinor = keyInfo.minorRelative;
		const dimChord = keyInfo.triads[6];
		const dimRoot = dimChord.replace('dim', '');
		return {
			major: FormatUtil.formatNote(root),
			minor: FormatUtil.formatNote(relativeMinor).toLowerCase(),
			dim: FormatUtil.formatNote(dimRoot).toLowerCase() + '°',
			majorNote: root,
			minorNote: relativeMinor,
			dimNote: dimRoot
		};
	});

	let isDragging = $state(false);
	let isRightDragging = $state(false);
	let currentDragSegment: { segment: number; ring: RingType } | null = $state(null);
	let svgElement: SVGSVGElement;
	let hoveredSegment: { index: number; ring: RingType } | null = $state(null);
	let currentChordNotes: Array<{ note: string; octave: number }> = [];
	let lockedTouchChord: { segment: number; ring: RingType } | null = $state(null);

	// Touch-specific state for tap/drag differentiation
	let touchStartPos: { x: number; y: number } | null = $state(null);
	let touchStartSegment: { segment: number; ring: RingType | null } | null = $state(null);
	let isTouchDragging = $state(false);
	let isTouchDevice = $state(false);
	const TOUCH_DRAG_THRESHOLD = 10;

	function getSvgPoint(clientX: number, clientY: number) {
		return GeometryUtil.clientToSvgCoords(clientX, clientY, svgElement, viewBox);
	}

	function getSegmentFromPoint(clientX: number, clientY: number): number {
		const point = getSvgPoint(clientX, clientY);
		const angle = GeometryUtil.getAngleFromCenter(point, center, rotationOffset);
		return GeometryUtil.getSegmentFromAngle(angle, segmentAngle);
	}

	function getRingFromPoint(clientX: number, clientY: number): RingType | null {
		const point = getSvgPoint(clientX, clientY);
		const distance = GeometryUtil.getDistanceFromCenter(point, center);

		// Check if in center circle
		if (distance < radii.center - centerPadding) return null;

		return GeometryUtil.getRingFromDistance(distance, CIRCLE_RINGS);
	}

	function isInCenterCircle(clientX: number, clientY: number): boolean {
		const point = getSvgPoint(clientX, clientY);
		const distance = GeometryUtil.getDistanceFromCenter(point, center);
		return distance < radii.center - centerPadding;
	}

	function getChordSymbol(
		segmentIndex: number,
		ring: RingType,
		seventh: boolean = false,
		ninth: boolean = false
	): string {
		const key = keys[segmentIndex];
		const useModern7th = appState.seventhStyle === 'modern';

		// For 7th/9th chords, use diatonic voicing when the chord is in the current key
		if ((seventh || ninth) && (ring === 'major' || ring === 'minor')) {
			const chordRoot = ring === 'major' ? key.majorNote : key.minorNote;
			const triadSymbol = ring === 'major' ? chordRoot : chordRoot + 'm';
			const degree = FormatUtil.getChordDegree(triadSymbol, appState.selectedRoot, appState.mode);

			if (degree !== null) {
				// Use diatonic 7th/9th chord from VoicingUtil for chords in the key
				const chord = ninth
					? VoicingUtil.getNinthChordForDegree(
							degree,
							appState.selectedRoot,
							appState.mode,
							useModern7th
						)
					: VoicingUtil.getSeventhChordForDegree(
							degree,
							appState.selectedRoot,
							appState.mode,
							useModern7th
						);
				if (chord && chord.symbol) {
					return FormatUtil.formatNote(chord.symbol);
				}
			}
		}

		// Fall back to building chord symbol directly for triads or non-diatonic chords
		if (ring === 'major') {
			return ChordUtil.buildChordSymbol(key.major, false, seventh, ninth, useModern7th);
		}
		if (ring === 'minor') {
			return ChordUtil.buildChordSymbol(key.minor, true, seventh, ninth, useModern7th);
		}

		// Diminished ring: special handling - becomes half-diminished in 7th/9th mode
		if (ninth) {
			return FormatUtil.formatNote(key.dimNote) + 'm9b5';
		}
		if (seventh) {
			return FormatUtil.formatNote(key.dimNote) + 'm7b5';
		}
		return key.dim;
	}

	function getInversionFromEvent(e: MouseEvent): 0 | 1 | 2 | 3 {
		const seventh = keyboardState.tabPressed;
		const ninth = keyboardState.ninePressed || e.ctrlKey;

		// 9th chords don't support inversions
		if (ninth) return 0;

		if (e.shiftKey && e.altKey) {
			// Both pressed: 3rd inversion in 7th mode, 2nd inversion otherwise
			return seventh ? 3 : 2;
		}
		if (e.shiftKey) return 2;
		if (e.altKey) return 1;
		return 0;
	}

	// Get scale degree for wheel coloring - always uses major key
	function getScaleDegree(segmentIndex: number, ring: RingType): number | null {
		const segment = keys[segmentIndex];
		const chordSymbol =
			ring === 'major'
				? segment.majorNote
				: ring === 'minor'
					? segment.minorNote + 'm'
					: segment.dimNote + 'dim';

		return FormatUtil.getChordDegreeInMajorKey(chordSymbol, appState.selectedRoot);
	}

	function getFillColor(segmentIndex: number, ring: RingType, hover: boolean = false): string {
		const degree = getScaleDegree(segmentIndex, ring);
		if (!degree) {
			return hover ? 'var(--circle-segment-hover)' : 'var(--circle-segment-default)';
		}
		return FormatUtil.getDegreeColor(degree, undefined, hover);
	}

	const FLAT_NUMERALS = [
		'I',
		'♭II',
		'II',
		'♭III',
		'III',
		'IV',
		'♭V',
		'V',
		'♭VI',
		'VI',
		'♭VII',
		'VII'
	];

	function getChromaticNumeral(segmentIndex: number): string {
		const segmentRoot = keys[segmentIndex].majorNote;
		const selectedChroma = Note.chroma(appState.selectedRoot);
		const segmentChroma = Note.chroma(segmentRoot);
		if (selectedChroma === undefined || segmentChroma === undefined) return '';
		const semitones = (segmentChroma - selectedChroma + 12) % 12;
		return FLAT_NUMERALS[semitones];
	}

	function isHovered(segmentIndex: number, ring: RingType): boolean {
		return hoveredSegment?.index === segmentIndex && hoveredSegment?.ring === ring;
	}

	function getLabelPosition(radius: number, angle: number) {
		return GeometryUtil.polarToCartesian(cx, cy, radius, angle);
	}

	// Play chord audio for a segment
	function playChordForSegment(
		segmentIndex: number,
		ring: RingType,
		inv: 0 | 1 | 2 | 3 = 0,
		forceNinth: boolean = false
	) {
		const seventh = keyboardState.tabPressed;
		const ninth = keyboardState.ninePressed || forceNinth;
		const chordSymbol = getChordSymbol(segmentIndex, ring, seventh, ninth);
		const unformatted = FormatUtil.unformatNote(chordSymbol);
		let notes = VoicingUtil.getVoicedNotesFromSymbol(
			unformatted,
			inv,
			appState.chordDisplayOctave,
			appState.voicingMode
		);
		// Convert notes to appropriate enharmonic spelling for the current key
		notes = notes.map((n) => ({
			note: FormatUtil.toKeyNotation(n.note, appState.selectedRoot),
			octave: n.octave
		}));
		if (notes.length > 0) {
			currentChordNotes = notes;
			appState.addPressedNotes(notes);
		}
	}

	// Touch event handlers
	function handleTouchStart(e: TouchEvent) {
		isTouchDevice = true;
		const touch = e.touches[0];
		touchStartPos = { x: touch.clientX, y: touch.clientY };
		const segment = getSegmentFromPoint(touch.clientX, touch.clientY);
		const ring = getRingFromPoint(touch.clientX, touch.clientY);
		touchStartSegment = { segment, ring };
		isTouchDragging = false;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!touchStartPos || !touchStartSegment) {
			touchStartPos = null;
			touchStartSegment = null;
			isTouchDragging = false;
			return;
		}

		// If it was a tap (not a drag), toggle chord
		if (!isTouchDragging) {
			const touch = e.changedTouches[0];
			const ring = getRingFromPoint(touch.clientX, touch.clientY);

			if (isInCenterCircle(touch.clientX, touch.clientY)) {
				appState.toggleMode();
			} else if (ring) {
				const segment = getSegmentFromPoint(touch.clientX, touch.clientY);

				// Clear any currently playing notes first
				if (currentChordNotes.length > 0) {
					appState.removePressedNotes(currentChordNotes);
					currentChordNotes = [];
				}

				// Toggle logic: if same cell, turn off; if different, switch
				if (lockedTouchChord?.segment === segment && lockedTouchChord?.ring === ring) {
					// Same cell - toggle OFF
					lockedTouchChord = null;
					hoveredSegment = null;
				} else {
					// Different cell (or none locked) - toggle ON
					playChordForSegment(segment, ring, 0);
					lockedTouchChord = { segment, ring };
					hoveredSegment = { index: segment, ring };
				}
			}
		}

		// Reset touch state
		touchStartPos = null;
		touchStartSegment = null;
		isTouchDragging = false;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!touchStartPos) return;

		const touch = e.touches[0];
		const dx = touch.clientX - touchStartPos.x;
		const dy = touch.clientY - touchStartPos.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > TOUCH_DRAG_THRESHOLD) {
			isTouchDragging = true;
			const segment = getSegmentFromPoint(touch.clientX, touch.clientY);
			appState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[segment];
		}
	}

	// Action to attach touch listeners
	const touchHandlers = (node: SVGSVGElement) => {
		node.addEventListener('touchstart', handleTouchStart as EventListener);
		node.addEventListener('touchend', handleTouchEnd as EventListener);
		node.addEventListener('touchmove', handleTouchMove as EventListener);

		return {
			destroy() {
				node.removeEventListener('touchstart', handleTouchStart as EventListener);
				node.removeEventListener('touchend', handleTouchEnd as EventListener);
				node.removeEventListener('touchmove', handleTouchMove as EventListener);
			}
		};
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
	viewBox="0 0 {viewBox} {viewBox}"
	class="max-h-full max-w-full touch-none select-none"
	role="application"
	aria-label="Circle of fifths - click or drag to select a key"
	bind:this={svgElement}
	use:touchHandlers
	oncontextmenu={(e) => e.preventDefault()}
	onmousedown={(e) => {
		if (isInCenterCircle(e.clientX, e.clientY)) return;

		// On macOS, Ctrl+Click sends button === 2 (right-click)
		// Treat Ctrl+Click as left-click for playing 9th chords
		const isLeftClick = e.button === 0 || (e.button === 2 && e.ctrlKey);
		const isRightClick = e.button === 2 && !e.ctrlKey;

		if (isLeftClick) {
			const ring = getRingFromPoint(e.clientX, e.clientY);
			if (ring) {
				isDragging = true;
				const segment = getSegmentFromPoint(e.clientX, e.clientY);
				currentDragSegment = { segment, ring };

				// Play chord (notes added to pressedNotes, chord will be auto-detected)
				const inversion = getInversionFromEvent(e);
				playChordForSegment(segment, ring, inversion, e.ctrlKey);

				// Set pressedDegree if chord is diatonic
				const seventh = keyboardState.tabPressed;
				const ninth = keyboardState.ninePressed || e.ctrlKey;
				const chordSymbol = getChordSymbol(segment, ring, seventh, ninth);
				const unformatted = FormatUtil.unformatNote(chordSymbol);
				const degree = FormatUtil.getChordDegree(unformatted, appState.selectedRoot, appState.mode);
				appState.pressedDegree = degree;
			}
		} else if (isRightClick) {
			isRightDragging = true;
		}
	}}
	onmouseup={(e) => {
		// On macOS, Ctrl+Click sends button === 2 (right-click)
		// Treat Ctrl+Click release as left-click release
		const isLeftClick = e.button === 0 || (e.button === 2 && e.ctrlKey);
		const isRightClick = e.button === 2 && !e.ctrlKey;

		if (isLeftClick) {
			// Check for center circle click (not drag) - skip on touch devices
			// On desktop, toggle chord display mode; on mobile, toggleMode is handled in touch handlers
			if (!isTouchDevice && !isDragging && isInCenterCircle(e.clientX, e.clientY)) {
				appState.toggleChordDisplayMode();
			}

			isDragging = false;
			currentDragSegment = null;
			appState.pressedDegree = null;

			// Clear pressed notes (but not if touch-locked)
			if (currentChordNotes.length > 0 && !lockedTouchChord) {
				appState.removePressedNotes(currentChordNotes);
				currentChordNotes = [];
			}
		} else if (isRightClick) {
			appState.selectedRoot =
				FormatUtil.CIRCLE_OF_FIFTHS[getSegmentFromPoint(e.clientX, e.clientY)];
			isRightDragging = false;
		}
	}}
	onmouseleave={() => {
		isDragging = false;
		isRightDragging = false;
		currentDragSegment = null;
		hoveredSegment = null;
		appState.pressedDegree = null;

		// Clear pressed notes when leaving (but not if touch-locked)
		if (currentChordNotes.length > 0 && !lockedTouchChord) {
			appState.removePressedNotes(currentChordNotes);
			currentChordNotes = [];
		}
	}}
	onmousemove={(e) => {
		// Skip mouse events on touch devices
		if (isTouchDevice) return;

		const ring = getRingFromPoint(e.clientX, e.clientY);
		const segment = getSegmentFromPoint(e.clientX, e.clientY);
		hoveredSegment = ring ? { index: segment, ring } : null;

		if (isRightDragging) {
			appState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[segment];
		} else if (isDragging && ring) {
			// Only update if segment or ring changed
			if (
				!currentDragSegment ||
				currentDragSegment.segment !== segment ||
				currentDragSegment.ring !== ring
			) {
				currentDragSegment = { segment, ring };

				// Clear previous pressed notes
				if (currentChordNotes.length > 0) {
					appState.removePressedNotes(currentChordNotes);
					currentChordNotes = [];
				}

				// Play new chord (notes added to pressedNotes, chord will be auto-detected)
				const inversion = getInversionFromEvent(e);
				playChordForSegment(segment, ring, inversion, e.ctrlKey);

				// Update pressedDegree if chord is diatonic
				const seventh = keyboardState.tabPressed;
				const ninth = keyboardState.ninePressed || e.ctrlKey;
				const chordSymbol = getChordSymbol(segment, ring, seventh, ninth);
				const unformatted = FormatUtil.unformatNote(chordSymbol);
				const degree = FormatUtil.getChordDegree(unformatted, appState.selectedRoot, appState.mode);
				appState.pressedDegree = degree;
			}
		}
	}}
>
	{#each keys as key, i (key.major)}
		{@const startAngle = i * segmentAngle + rotationOffset}
		{@const endAngle = (i + 1) * segmentAngle + rotationOffset}
		{@const midAngle = startAngle + segmentAngle / 2}

		<!-- Outer ring (major keys) -->
		<path
			d={GeometryUtil.describeArc(cx, cy, radii.mid, radii.outer, startAngle, endAngle)}
			fill={getFillColor(i, 'major', isHovered(i, 'major'))}
			stroke="var(--border-color)"
			class="cursor-pointer stroke-1"
		/>

		<!-- Middle ring (minor keys) -->
		<path
			d={GeometryUtil.describeArc(cx, cy, radii.inner, radii.mid, startAngle, endAngle)}
			fill={getFillColor(i, 'minor', isHovered(i, 'minor'))}
			stroke="var(--border-color)"
			class="cursor-pointer stroke-1"
		/>

		<!-- Inner ring (diminished chords) -->
		<path
			d={GeometryUtil.describeArc(cx, cy, radii.center, radii.inner, startAngle, endAngle)}
			fill={getFillColor(i, 'dim', isHovered(i, 'dim'))}
			stroke="var(--border-color)"
			class="cursor-pointer stroke-1"
		/>

		<!-- Major key label -->
		{@const majorPos = getLabelPosition((radii.outer + radii.mid) / 2, midAngle)}
		{@const majorInKey = getScaleDegree(i, 'major') !== null}
		<text
			x={majorPos.x}
			y={majorPos.y}
			text-anchor="middle"
			dominant-baseline="central"
			font-size={fontSizes.major}
			fill={majorInKey || appState.mode === 'major'
				? 'var(--text-primary)'
				: 'var(--text-secondary)'}
			class="font-music pointer-events-none"
		>
			{key.major}
		</text>

		<!-- Minor key label -->
		{@const minorPos = getLabelPosition((radii.mid + radii.inner) / 2, midAngle)}
		{@const minorInKey = getScaleDegree(i, 'minor') !== null}
		<text
			x={minorPos.x}
			y={minorPos.y}
			text-anchor="middle"
			dominant-baseline="central"
			font-size={fontSizes.minor}
			fill={minorInKey || appState.mode === 'minor'
				? 'var(--text-primary)'
				: 'var(--text-secondary)'}
			class="font-music pointer-events-none"
		>
			{key.minor}
		</text>

		<!-- Diminished chord label -->
		{@const dimPos = getLabelPosition((radii.inner + radii.center) / 2, midAngle)}
		{@const dimInKey = getScaleDegree(i, 'dim') !== null}
		<text
			x={dimPos.x}
			y={dimPos.y}
			text-anchor="middle"
			dominant-baseline="central"
			font-size={fontSizes.dim}
			fill={dimInKey ? 'var(--text-primary)' : 'var(--text-secondary)'}
			class="font-music pointer-events-none"
		>
			{key.dim}
		</text>

		<!-- Outer chromatic numeral indicator -->
		{@const numeralPos = getLabelPosition(radii.outer + 14, midAngle)}
		{@const numeral = getChromaticNumeral(i)}
		<text
			x={numeralPos.x}
			y={numeralPos.y}
			text-anchor="middle"
			dominant-baseline="central"
			font-size="13"
			transform="rotate({midAngle}, {numeralPos.x}, {numeralPos.y})"
			fill="var(--text-secondary)"
			class="font-music pointer-events-none"
		>
			{numeral}
		</text>
	{/each}

	<!-- Center circle with roman numeral - click to toggle mode -->
	<circle
		{cx}
		{cy}
		r={radii.center - centerPadding}
		fill="var(--bg-primary)"
		class="cursor-pointer outline-none"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') appState.toggleMode();
		}}
		role="button"
		tabindex="0"
		aria-label="Toggle major/minor mode"
	/>
	{#if appState.detectedChord}
		{@const detected = appState.detectedChord}
		{@const result = getChordRomanNumeral()}
		{#if result}
			{@const inversion = detected.inversion}
			{@const chordSymbol = FormatUtil.unformatNote(detected.symbol)}
			{@const chordType = getChordType(chordSymbol)}
			{@const chord = Chord.get(chordSymbol)}
			{@const chordNotes = chord.notes}
			{@const bassNote = detected.bass ?? chordNotes[0]}
			{@const bassDegree = FormatUtil.getNoteDegreeInMajorKey(bassNote, appState.selectedRoot)}
			{@const numeralColor = bassDegree
				? FormatUtil.getDegreeColor(bassDegree)
				: 'var(--text-primary)'}
			{@const isLetterMode = appState.chordDisplayMode === 'letter'}
			{@const letterChordSymbol = formatSlashChordSymbol(
				FormatUtil.toKeyNotationFormatted(detected.symbol, appState.selectedRoot)
			)}
			{@const letterBassNote = detected.bass
				? FormatUtil.formatNote(
						FormatUtil.toKeyNotationFormatted(detected.bass, appState.selectedRoot)
					)
				: undefined}
			<foreignObject x={cx - 60} y={cy - 45} width="120" height="90" class="pointer-events-none">
				<div class="center-numeral">
					<ChordDisplay
						numeral={isLetterMode ? letterChordSymbol : result.numeral}
						bassNote={isLetterMode ? letterBassNote : undefined}
						{inversion}
						isSeventh={isLetterMode ? false : chordType === 'seventh'}
						isNinth={isLetterMode ? false : chordType === 'ninth'}
						color={numeralColor}
						size="lg"
						displayMode={appState.chordDisplayMode}
					/>
				</div>
			</foreignObject>
		{/if}
	{/if}
</svg>

<style>
	.center-numeral {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
