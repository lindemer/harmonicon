<script lang="ts">
	import { Key } from 'tonal';
	import { musicState } from '$lib/stores/music.svelte';
	import { FormatUtil } from '$lib/utils/format';

	// Build keys array from circle of fifths using Tonal
	// Uses Tonal standard notation: C, Am, Bdim (uppercase root + quality suffix)
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

	const cx = 200;
	const cy = 200;

	// Perspective-based ring sizing for tunnel effect
	// Each ring appears progressively smaller as if receding into depth
	const outerRadius = 185;
	const midRadius = 135; // outer ring width: 50
	const innerRadius = 95; // middle ring width: 40
	const centerRadius = 65; // inner ring width: 30, center hole: 65

	// Font sizes that scale with perspective
	const majorFontSize = 18;
	const minorFontSize = 14;
	const dimFontSize = 11;

	const segmentAngle = 360 / 12;
	const rotationOffset = -15;

	let isDragging = $state(false);
	let isRightDragging = $state(false);
	let rightDragMoved = $state(false);
	let rightClickStart: { segment: number; ring: 'major' | 'minor' | 'dim' } | null = $state(null);
	let svgElement: SVGSVGElement;

	function getSegmentFromPoint(clientX: number, clientY: number, svg: SVGSVGElement): number {
		const rect = svg.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const svgX = (x / rect.width) * 400;
		const svgY = (y / rect.height) * 400;

		const dx = svgX - cx;
		const dy = svgY - cy;
		let angle = Math.atan2(dy, dx) * (180 / Math.PI);
		angle = (angle + 90 + 360) % 360;
		angle = (angle - rotationOffset + 360) % 360;

		return Math.floor(angle / segmentAngle);
	}

	function getRingFromPoint(clientX: number, clientY: number, svg: SVGSVGElement): 'major' | 'minor' | 'dim' | null {
		const rect = svg.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const svgX = (x / rect.width) * 400;
		const svgY = (y / rect.height) * 400;

		const dx = svgX - cx;
		const dy = svgY - cy;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < centerRadius - 5) return null; // Center circle
		if (distance < innerRadius) return 'dim';
		if (distance < midRadius) return 'minor';
		if (distance < outerRadius) return 'major';
		return null; // Outside the wheel
	}

	function handleClick(segmentIndex: number) {
		musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[segmentIndex];
	}

	function getChordSymbol(segmentIndex: number, ring: 'major' | 'minor' | 'dim'): string {
		const key = keys[segmentIndex];
		if (ring === 'major') return key.major;
		if (ring === 'minor') return key.minor;
		return key.dim;
	}

	function handleRightClick(clientX: number, clientY: number, toggle: boolean) {
		const ring = getRingFromPoint(clientX, clientY, svgElement);
		if (!ring) return;

		const segmentIndex = getSegmentFromPoint(clientX, clientY, svgElement);
		const chordSymbol = getChordSymbol(segmentIndex, ring);

		if (toggle && musicState.selectedChord === chordSymbol) {
			// Toggle off only on initial click, not during drag
			musicState.selectedChord = null;
		} else {
			musicState.selectedChord = chordSymbol;
		}
	}

	// Get scale degree for wheel coloring - always uses major key (independent of mode toggle)
	function getScaleDegree(segmentIndex: number, ring: 'major' | 'minor' | 'dim'): number | null {
		const segment = keys[segmentIndex];
		// Build chord symbol: 'C', 'Am', 'Bdim'
		const chordSymbol =
			ring === 'major'
				? segment.majorNote
				: ring === 'minor'
					? segment.minorNote + 'm'
					: segment.dimNote + 'dim';

		return FormatUtil.getChordDegreeInMajorKey(chordSymbol, musicState.selectedRoot);
	}

	function getFillColor(segmentIndex: number, ring: 'major' | 'minor' | 'dim'): string {
		const degree = getScaleDegree(segmentIndex, ring);
		return FormatUtil.getDegreeColor(degree);
	}

	function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
		const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
		return {
			x: centerX + radius * Math.cos(angleInRadians),
			y: centerY + radius * Math.sin(angleInRadians)
		};
	}

	function describeArc(
		centerX: number,
		centerY: number,
		innerR: number,
		outerR: number,
		startAngle: number,
		endAngle: number
	) {
		const outerStart = polarToCartesian(centerX, centerY, outerR, startAngle);
		const outerEnd = polarToCartesian(centerX, centerY, outerR, endAngle);
		const innerStart = polarToCartesian(centerX, centerY, innerR, startAngle);
		const innerEnd = polarToCartesian(centerX, centerY, innerR, endAngle);

		const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

		return [
			'M', outerStart.x, outerStart.y,
			'A', outerR, outerR, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
			'L', innerEnd.x, innerEnd.y,
			'A', innerR, innerR, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
			'Z'
		].join(' ');
	}

	function getLabelPosition(centerX: number, centerY: number, radius: number, angle: number) {
		return polarToCartesian(centerX, centerY, radius, angle);
	}

	function isInCenterCircle(clientX: number, clientY: number, svg: SVGSVGElement): boolean {
		const rect = svg.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const svgX = (x / rect.width) * 400;
		const svgY = (y / rect.height) * 400;

		const dx = svgX - cx;
		const dy = svgY - cy;
		const distance = Math.sqrt(dx * dx + dy * dy);

		return distance < centerRadius - 5;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
	viewBox="0 0 400 400"
	class="w-full max-w-lg select-none"
	role="application"
	aria-label="Circle of fifths - click or drag to select a key"
	bind:this={svgElement}
	oncontextmenu={(e) => e.preventDefault()}
	onmousedown={(e) => {
		if (isInCenterCircle(e.clientX, e.clientY, svgElement)) return;

		if (e.button === 0) {
			// Left click - track start position for chord selection
			const ring = getRingFromPoint(e.clientX, e.clientY, svgElement);
			if (ring) {
				isDragging = true;
				rightDragMoved = false;
				rightClickStart = {
					segment: getSegmentFromPoint(e.clientX, e.clientY, svgElement),
					ring
				};
			}
		} else if (e.button === 2) {
			// Right click - root key selection
			isRightDragging = true;
		}
	}}
	onmouseup={(e) => {
		if (e.button === 0) {
			if (!rightDragMoved && rightClickStart) {
				// Didn't drag - toggle the chord
				const chordSymbol = getChordSymbol(rightClickStart.segment, rightClickStart.ring);
				if (musicState.selectedChord === chordSymbol) {
					musicState.selectedChord = null;
				} else {
					musicState.selectedChord = chordSymbol;
				}
			}
			isDragging = false;
			rightClickStart = null;
		} else if (e.button === 2) {
			// Right click - set root key
			musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[getSegmentFromPoint(e.clientX, e.clientY, svgElement)];
			isRightDragging = false;
		}
	}}
	onmouseleave={() => {
		isDragging = false;
		isRightDragging = false;
		rightClickStart = null;
	}}
	onmousemove={(e) => {
		if (isRightDragging) {
			musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[getSegmentFromPoint(e.clientX, e.clientY, svgElement)];
		} else if (isDragging) {
			// Check if we've moved to a different chord
			const ring = getRingFromPoint(e.clientX, e.clientY, svgElement);
			const segment = getSegmentFromPoint(e.clientX, e.clientY, svgElement);
			if (ring && rightClickStart && (ring !== rightClickStart.ring || segment !== rightClickStart.segment)) {
				rightDragMoved = true;
			}
			if (rightDragMoved) {
				handleRightClick(e.clientX, e.clientY, false);
			}
		}
	}}
	ontouchstart={(e) => {
		const touch = e.touches[0];
		if (!isInCenterCircle(touch.clientX, touch.clientY, svgElement)) {
			isDragging = true;
		}
	}}
	ontouchend={() => (isDragging = false)}
	ontouchmove={(e) => {
		if (isDragging) {
			const touch = e.touches[0];
			musicState.selectedRoot = FormatUtil.CIRCLE_OF_FIFTHS[getSegmentFromPoint(touch.clientX, touch.clientY, svgElement)];
		}
	}}
>
	{#each keys as key, i}
		{@const startAngle = i * segmentAngle + rotationOffset}
		{@const endAngle = (i + 1) * segmentAngle + rotationOffset}
		{@const midAngle = startAngle + segmentAngle / 2}

		<!-- Outer ring (major keys) -->
		<path
			d={describeArc(cx, cy, midRadius, outerRadius, startAngle, endAngle)}
			fill={getFillColor(i, 'major')}
			class="cursor-pointer stroke-white stroke-1"
		/>

		<!-- Middle ring (minor keys) -->
		<path
			d={describeArc(cx, cy, innerRadius, midRadius, startAngle, endAngle)}
			fill={getFillColor(i, 'minor')}
			class="cursor-pointer stroke-white stroke-1"
		/>

		<!-- Inner ring (diminished chords) -->
		<path
			d={describeArc(cx, cy, centerRadius, innerRadius, startAngle, endAngle)}
			fill={getFillColor(i, 'dim')}
			class="cursor-pointer stroke-white stroke-1"
		/>

		<!-- Major key label -->
		{@const majorPos = getLabelPosition(cx, cy, (outerRadius + midRadius) / 2, midAngle)}
		<text
			x={majorPos.x}
			y={majorPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={majorFontSize}
			class="{musicState.selectedChord === key.major ? 'fill-white font-bold' : 'fill-gray-100'} font-music pointer-events-none"
		>
			{key.major}
		</text>

		<!-- Minor key label -->
		{@const minorPos = getLabelPosition(cx, cy, (midRadius + innerRadius) / 2, midAngle)}
		<text
			x={minorPos.x}
			y={minorPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={minorFontSize}
			class="{musicState.selectedChord === key.minor ? 'fill-white font-bold' : 'fill-gray-100'} font-music pointer-events-none"
		>
			{key.minor}
		</text>

		<!-- Diminished chord label -->
		{@const dimPos = getLabelPosition(cx, cy, (innerRadius + centerRadius) / 2, midAngle)}
		<text
			x={dimPos.x}
			y={dimPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={dimFontSize}
			class="{musicState.selectedChord === key.dim ? 'fill-white font-bold' : 'fill-gray-100'} font-music pointer-events-none"
		>
			{key.dim}
		</text>
	{/each}

	<!-- Center circle (non-interactive) -->
	<circle cx={cx} cy={cy} r={centerRadius - 5} fill="#111827" />

	<!-- Selected chord border overlay -->
	{#each keys as key, i}
		{@const startAngle = i * segmentAngle + rotationOffset}
		{@const endAngle = (i + 1) * segmentAngle + rotationOffset}
		{#if musicState.selectedChord === key.major}
			<path
				d={describeArc(cx, cy, midRadius, outerRadius, startAngle, endAngle)}
				fill="none"
				class="stroke-white stroke-[3] pointer-events-none"
			/>
		{/if}
		{#if musicState.selectedChord === key.minor}
			<path
				d={describeArc(cx, cy, innerRadius, midRadius, startAngle, endAngle)}
				fill="none"
				class="stroke-white stroke-[3] pointer-events-none"
			/>
		{/if}
		{#if musicState.selectedChord === key.dim}
			<path
				d={describeArc(cx, cy, centerRadius, innerRadius, startAngle, endAngle)}
				fill="none"
				class="stroke-white stroke-[3] pointer-events-none"
			/>
		{/if}
	{/each}
</svg>
