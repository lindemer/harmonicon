<script lang="ts">
	import { Key, Chord } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';
	import {
		clientToSvgCoords,
		getDistanceFromCenter,
		getAngleFromCenter,
		polarToCartesian,
		describeArc,
		getSegmentFromAngle,
		getRingFromDistance
	} from '$lib/utils/geometry';
	import { CIRCLE_DIMENSIONS, CIRCLE_RINGS, type RingType } from '$lib/constants/circle';
	import RomanNumeral from './RomanNumeral.svelte';

	const { viewBox, center, radii, fontSizes, segmentAngle, rotationOffset, centerPadding } = CIRCLE_DIMENSIONS;
	const cx = center.x;
	const cy = center.y;

	function getChordRomanNumeral(): { numeral: string; isDiatonic: boolean } | null {
		if (!musicState.selectedChord) return null;
		const chordSymbol = FormatUtil.unformatNote(musicState.selectedChord);
		return FormatUtil.getChordRomanNumeral(chordSymbol, musicState.selectedRoot, musicState.mode);
	}

	// Build keys array from circle of fifths using Tonal
	const keys = FormatUtil.CIRCLE_OF_FIFTHS.map((root) => {
		const keyInfo = Key.majorKey(root);
		const relativeMinor = keyInfo.minorRelative;
		const dimChord = keyInfo.triads[6];
		const dimRoot = dimChord.replace('dim', '');
		return {
			major: FormatUtil.formatNote(root),
			minor: FormatUtil.formatNote(relativeMinor) + 'm',
			dim: FormatUtil.formatNote(dimRoot) + '°',
			majorNote: root,
			minorNote: relativeMinor,
			dimNote: dimRoot
		};
	});

	let isDragging = $state(false);
	let isRightDragging = $state(false);
	let rightDragMoved = $state(false);
	let rightClickStart: { segment: number; ring: RingType } | null = $state(null);
	let svgElement: SVGSVGElement;
	let hoveredSegment: { index: number; ring: RingType } | null = $state(null);

	function getSvgPoint(clientX: number, clientY: number) {
		return clientToSvgCoords(clientX, clientY, svgElement, viewBox);
	}

	function getSegmentFromPoint(clientX: number, clientY: number): number {
		const point = getSvgPoint(clientX, clientY);
		const angle = getAngleFromCenter(point, center, rotationOffset);
		return getSegmentFromAngle(angle, segmentAngle);
	}

	function getRingFromPoint(clientX: number, clientY: number): RingType | null {
		const point = getSvgPoint(clientX, clientY);
		const distance = getDistanceFromCenter(point, center);

		// Check if in center circle
		if (distance < radii.center - centerPadding) return null;

		return getRingFromDistance(distance, CIRCLE_RINGS);
	}

	function isInCenterCircle(clientX: number, clientY: number): boolean {
		const point = getSvgPoint(clientX, clientY);
		const distance = getDistanceFromCenter(point, center);
		return distance < radii.center - centerPadding;
	}

	function handleClick(segmentIndex: number) {
		musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[segmentIndex];
	}

	function getChordSymbol(segmentIndex: number, ring: RingType): string {
		const key = keys[segmentIndex];
		if (ring === 'major') return key.major;
		if (ring === 'minor') return key.minor;
		return key.dim;
	}

	function getInversionFromEvent(e: MouseEvent): 0 | 1 | 2 {
		if (e.altKey && e.shiftKey) return 2;
		if (e.altKey) return 1;
		return 0;
	}

	function handleChordSelection(clientX: number, clientY: number, toggle: boolean, inversion: 0 | 1 | 2 = 0) {
		const ring = getRingFromPoint(clientX, clientY);
		if (!ring) return;

		const segmentIndex = getSegmentFromPoint(clientX, clientY);
		const chordSymbol = getChordSymbol(segmentIndex, ring);

		musicState.selectChord(chordSymbol, inversion, toggle);
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

		return FormatUtil.getChordDegreeInMajorKey(chordSymbol, musicState.selectedRoot);
	}

	function getFillColor(segmentIndex: number, ring: RingType, hover: boolean = false): string {
		const degree = getScaleDegree(segmentIndex, ring);
		if (!degree) {
			return hover ? '#1f2937' : '#111827';
		}
		return FormatUtil.getDegreeColor(degree, undefined, hover);
	}

	function isHovered(segmentIndex: number, ring: RingType): boolean {
		return hoveredSegment?.index === segmentIndex && hoveredSegment?.ring === ring;
	}

	function getLabelPosition(radius: number, angle: number) {
		return polarToCartesian(cx, cy, radius, angle);
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
	viewBox="0 0 {viewBox} {viewBox}"
	class="h-full w-auto select-none"
	role="application"
	aria-label="Circle of fifths - click or drag to select a key"
	bind:this={svgElement}
	oncontextmenu={(e) => e.preventDefault()}
	onmousedown={(e) => {
		if (isInCenterCircle(e.clientX, e.clientY)) return;

		if (e.button === 0) {
			const ring = getRingFromPoint(e.clientX, e.clientY);
			if (ring) {
				isDragging = true;
				rightDragMoved = false;
				rightClickStart = {
					segment: getSegmentFromPoint(e.clientX, e.clientY),
					ring
				};
				musicState.isChordPressed = true;
			}
		} else if (e.button === 2) {
			isRightDragging = true;
		}
	}}
	onmouseup={(e) => {
		if (e.button === 0) {
			if (!rightDragMoved && rightClickStart) {
				const chordSymbol = getChordSymbol(rightClickStart.segment, rightClickStart.ring);
				const inversion = getInversionFromEvent(e);
				musicState.selectChord(chordSymbol, inversion, true);
			}
			isDragging = false;
			rightClickStart = null;
			musicState.isChordPressed = false;
		} else if (e.button === 2) {
			musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[getSegmentFromPoint(e.clientX, e.clientY)];
			isRightDragging = false;
		}
	}}
	onmouseleave={() => {
		isDragging = false;
		isRightDragging = false;
		rightClickStart = null;
		hoveredSegment = null;
		musicState.isChordPressed = false;
	}}
	onmousemove={(e) => {
		const ring = getRingFromPoint(e.clientX, e.clientY);
		const segment = getSegmentFromPoint(e.clientX, e.clientY);
		hoveredSegment = ring ? { index: segment, ring } : null;

		if (isRightDragging) {
			musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[segment];
		} else if (isDragging) {
			if (ring && rightClickStart && (ring !== rightClickStart.ring || segment !== rightClickStart.segment)) {
				rightDragMoved = true;
			}
			if (rightDragMoved) {
				handleChordSelection(e.clientX, e.clientY, false, getInversionFromEvent(e));
			}
		}
	}}
	ontouchstart={(e) => {
		const touch = e.touches[0];
		if (!isInCenterCircle(touch.clientX, touch.clientY)) {
			isDragging = true;
			const ring = getRingFromPoint(touch.clientX, touch.clientY);
			if (ring) {
				musicState.isChordPressed = true;
			}
		}
	}}
	ontouchend={() => {
		isDragging = false;
		musicState.isChordPressed = false;
	}}
	ontouchmove={(e) => {
		if (isDragging) {
			const touch = e.touches[0];
			musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[getSegmentFromPoint(touch.clientX, touch.clientY)];
		}
	}}
>
	{#each keys as key, i}
		{@const startAngle = i * segmentAngle + rotationOffset}
		{@const endAngle = (i + 1) * segmentAngle + rotationOffset}
		{@const midAngle = startAngle + segmentAngle / 2}

		<!-- Outer ring (major keys) -->
		<path
			d={describeArc(cx, cy, radii.mid, radii.outer, startAngle, endAngle)}
			fill={musicState.selectedChord === key.major ? 'white' : getFillColor(i, 'major', isHovered(i, 'major'))}
			class="cursor-pointer stroke-gray-300 stroke-1"
		/>

		<!-- Middle ring (minor keys) -->
		<path
			d={describeArc(cx, cy, radii.inner, radii.mid, startAngle, endAngle)}
			fill={musicState.selectedChord === key.minor ? 'white' : getFillColor(i, 'minor', isHovered(i, 'minor'))}
			class="cursor-pointer stroke-gray-300 stroke-1"
		/>

		<!-- Inner ring (diminished chords) -->
		<path
			d={describeArc(cx, cy, radii.center, radii.inner, startAngle, endAngle)}
			fill={musicState.selectedChord === key.dim ? 'white' : getFillColor(i, 'dim', isHovered(i, 'dim'))}
			class="cursor-pointer stroke-gray-300 stroke-1"
		/>

		<!-- Major key label -->
		{@const majorPos = getLabelPosition((radii.outer + radii.mid) / 2, midAngle)}
		{@const majorInKey = getScaleDegree(i, 'major') !== null}
		<text
			x={majorPos.x}
			y={majorPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={fontSizes.major}
			fill={musicState.selectedChord === key.major ? getFillColor(i, 'major') : undefined}
			class="{musicState.selectedChord !== key.major ? (majorInKey || musicState.mode === 'major' ? 'fill-gray-100' : 'fill-gray-400') : ''} font-music pointer-events-none"
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
			dominant-baseline="middle"
			font-size={fontSizes.minor}
			fill={musicState.selectedChord === key.minor ? getFillColor(i, 'minor') : undefined}
			class="{musicState.selectedChord !== key.minor ? (minorInKey || musicState.mode === 'minor' ? 'fill-gray-100' : 'fill-gray-400') : ''} font-music pointer-events-none"
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
			dominant-baseline="middle"
			font-size={fontSizes.dim}
			fill={musicState.selectedChord === key.dim ? getFillColor(i, 'dim') : undefined}
			class="{musicState.selectedChord !== key.dim ? (dimInKey ? 'fill-gray-100' : 'fill-gray-400') : ''} font-music pointer-events-none"
		>
			{key.dim}
		</text>
	{/each}

	<!-- Center circle with roman numeral - click to toggle mode -->
	<circle
		cx={cx}
		cy={cy}
		r={radii.center - centerPadding}
		fill="#111827"
		class="cursor-pointer"
		onclick={() => musicState.toggleMode()}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') musicState.toggleMode(); }}
		role="button"
		tabindex="0"
		aria-label="Toggle major/minor mode"
	/>
	{#if musicState.selectedChord}
		{@const result = getChordRomanNumeral()}
		{#if result}
			{@const inversion = musicState.selectedInversion}
			{@const chordSymbol = FormatUtil.unformatNote(musicState.selectedChord)}
			{@const chord = Chord.get(chordSymbol)}
			{@const chordNotes = chord.notes}
			{@const bassNote = chordNotes[inversion] ?? chordNotes[0]}
			{@const bassDegree = musicState.getMajorDegree(bassNote)}
			{@const numeralColor = bassDegree ? FormatUtil.getDegreeColor(bassDegree) : 'white'}
			<foreignObject x={cx - 50} y={cy - 25} width="100" height="50" class="pointer-events-none">
				<div class="center-numeral">
					<RomanNumeral numeral={result.numeral} inversion={inversion} color={numeralColor} size="lg" />
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
