<script lang="ts">
	import { Key, Note } from 'tonal';

	// Circle of fifths order (majors), used for display labels
	const circleOfFifths = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

	// Convert accidentals to proper symbols (# -> ♯, b after note -> ♭)
	function formatNote(note: string, lowercase = false): string {
		// Replace # with ♯
		let formatted = note.replace('#', '♯');
		// Replace 'b' only when it's a flat (after A-G), not when it's the note B
		formatted = formatted.replace(/([A-Ga-g])b/g, '$1♭');
		return lowercase ? formatted.toLowerCase() : formatted;
	}

	// Build keys array from circle of fifths using Tonal
	const keys = circleOfFifths.map((root) => {
		const keyInfo = Key.majorKey(root);
		const relativeMinor = keyInfo.minorRelative;
		const dimChord = keyInfo.triads[6]; // vii° is the 7th triad (index 6)
		const dimRoot = dimChord.replace('dim', '');
		return {
			major: formatNote(root),
			minor: formatNote(relativeMinor, true),
			dim: formatNote(dimRoot, true) + '°',
			// Store original note names for Tonal lookups
			majorNote: root,
			minorNote: relativeMinor,
			dimNote: dimRoot
		};
	});

	const cx = 200;
	const cy = 200;
	const outerRadius = 180;
	const midRadius = 140;
	const innerRadius = 100;
	const centerRadius = 75;
	const segmentAngle = 360 / 12;
	const rotationOffset = -15;

	let selectedRoot: number = $state(0);
	let isDragging = $state(false);
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

	const degreeColors: Record<number, string> = {
		1: 'fill-red-500',
		2: 'fill-orange-500',
		3: 'fill-yellow-500',
		4: 'fill-green-500',
		5: 'fill-cyan-500',
		6: 'fill-purple-500',
		7: 'fill-pink-500'
	};

	function handleClick(segmentIndex: number) {
		selectedRoot = segmentIndex;
	}

	// Get the scale degree (1-7) for a chord in the selected key, or null if not diatonic
	function getScaleDegree(
		segmentIndex: number,
		ring: 'major' | 'minor' | 'dim'
	): number | null {
		const selectedKey = Key.majorKey(circleOfFifths[selectedRoot]);
		const segment = keys[segmentIndex];

		let chordNote: string;
		if (ring === 'major') {
			chordNote = segment.majorNote;
		} else if (ring === 'minor') {
			chordNote = segment.minorNote;
		} else {
			chordNote = segment.dimNote;
		}

		// Find which triad in the key matches this chord
		for (let i = 0; i < selectedKey.triads.length; i++) {
			const triad = selectedKey.triads[i];
			const triadRoot = triad.replace(/m$|dim$/, '');

			// Check if the chord types match
			const isMajorTriad = !triad.includes('m') && !triad.includes('dim');
			const isMinorTriad = triad.endsWith('m') && !triad.includes('dim');
			const isDimTriad = triad.includes('dim');

			const wantMajor = ring === 'major';
			const wantMinor = ring === 'minor';
			const wantDim = ring === 'dim';

			// Use chroma (pitch class 0-11) to compare enharmonic equivalents
			const sameNote = Note.chroma(triadRoot) === Note.chroma(chordNote);

			if (sameNote) {
				if ((wantMajor && isMajorTriad) || (wantMinor && isMinorTriad) || (wantDim && isDimTriad)) {
					return i + 1; // Scale degrees are 1-indexed
				}
			}
		}

		return null;
	}

	function getFillClass(segmentIndex: number, ring: 'major' | 'minor' | 'dim'): string {
		const degree = getScaleDegree(segmentIndex, ring);
		if (degree) return degreeColors[degree];
		return 'fill-gray-800';
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
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svg
	viewBox="0 0 400 400"
	class="w-full max-w-lg"
	role="application"
	aria-label="Circle of fifths - click or drag to select a key"
	bind:this={svgElement}
	onmousedown={() => (isDragging = true)}
	onmouseup={() => (isDragging = false)}
	onmouseleave={() => (isDragging = false)}
	onmousemove={(e) => {
		if (isDragging) {
			selectedRoot = getSegmentFromPoint(e.clientX, e.clientY, svgElement);
		}
	}}
	ontouchstart={() => (isDragging = true)}
	ontouchend={() => (isDragging = false)}
	ontouchmove={(e) => {
		if (isDragging) {
			const touch = e.touches[0];
			selectedRoot = getSegmentFromPoint(touch.clientX, touch.clientY, svgElement);
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
			class="{getFillClass(i, 'major')} stroke-white stroke-1 cursor-pointer"
			role="button"
			tabindex="0"
			aria-label="{key.major} major"
			onclick={() => handleClick(i)}
			onkeydown={(e) => e.key === 'Enter' && handleClick(i)}
		/>

		<!-- Middle ring (minor keys) -->
		<path
			d={describeArc(cx, cy, innerRadius, midRadius, startAngle, endAngle)}
			class="{getFillClass(i, 'minor')} stroke-white stroke-1 cursor-pointer"
			role="button"
			tabindex="0"
			aria-label="{key.minor} minor"
			onclick={() => handleClick(i)}
			onkeydown={(e) => e.key === 'Enter' && handleClick(i)}
		/>

		<!-- Inner ring (diminished chords) -->
		<path
			d={describeArc(cx, cy, centerRadius, innerRadius, startAngle, endAngle)}
			class="{getFillClass(i, 'dim')} stroke-white stroke-1 cursor-pointer"
			role="button"
			tabindex="0"
			aria-label="{key.dim} diminished"
			onclick={() => handleClick(i)}
			onkeydown={(e) => e.key === 'Enter' && handleClick(i)}
		/>

		<!-- Major key label -->
		{@const majorPos = getLabelPosition(cx, cy, (outerRadius + midRadius) / 2, midAngle)}
		{@const majorDegree = getScaleDegree(i, 'major')}
		<text
			x={majorPos.x}
			y={majorPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			class="{majorDegree ? 'fill-gray-900' : 'fill-gray-300'} text-lg pointer-events-none"
		>
			{key.major}
		</text>

		<!-- Minor key label -->
		{@const minorPos = getLabelPosition(cx, cy, (midRadius + innerRadius) / 2, midAngle)}
		{@const minorDegree = getScaleDegree(i, 'minor')}
		<text
			x={minorPos.x}
			y={minorPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			class="{minorDegree ? 'fill-gray-900' : 'fill-gray-300'} text-sm pointer-events-none"
		>
			{key.minor}
		</text>

		<!-- Diminished chord label -->
		{@const dimPos = getLabelPosition(cx, cy, (innerRadius + centerRadius) / 2, midAngle)}
		{@const dimDegree = getScaleDegree(i, 'dim')}
		<text
			x={dimPos.x}
			y={dimPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			class="{dimDegree ? 'fill-gray-900' : 'fill-gray-300'} text-xs pointer-events-none"
		>
			{key.dim}
		</text>
	{/each}
</svg>
