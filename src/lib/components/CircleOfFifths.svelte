<script lang="ts">
	const keys = [
		{ major: 'C', minor: 'a', dim: 'b°' },
		{ major: 'G', minor: 'e', dim: 'f♯°' },
		{ major: 'D', minor: 'b', dim: 'c♯°' },
		{ major: 'A', minor: 'f♯', dim: 'g♯°' },
		{ major: 'E', minor: 'c♯', dim: 'd♯°' },
		{ major: 'B', minor: 'g♯', dim: 'a♯°' },
		{ major: 'F♯', minor: 'd♯', dim: 'e♯°' },
		{ major: 'D♭', minor: 'b♭', dim: 'c°' },
		{ major: 'A♭', minor: 'f', dim: 'g°' },
		{ major: 'E♭', minor: 'c', dim: 'd°' },
		{ major: 'B♭', minor: 'g', dim: 'a°' },
		{ major: 'F', minor: 'd', dim: 'e°' }
	];

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

		// Convert to SVG coordinates
		const svgX = (x / rect.width) * 400;
		const svgY = (y / rect.height) * 400;

		// Calculate angle from center
		const dx = svgX - cx;
		const dy = svgY - cy;
		let angle = Math.atan2(dy, dx) * (180 / Math.PI);
		angle = (angle + 90 + 360) % 360; // Adjust so 0° is at top
		angle = (angle - rotationOffset + 360) % 360; // Account for rotation offset

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

	// Circle of fifths offsets for major chords in a key
	// I is at the root, V is +1 clockwise, IV is -1 (or +11)
	const majorDegreeOffsets: Record<number, number> = {
		0: 1,  // I
		1: 5,  // V
		11: 4  // IV
	};

	// Minor chords shown in each segment are the RELATIVE MINOR of that segment's major
	// The relative minor is 3 positions COUNTER-clockwise from its relative major
	// So to find where a minor chord appears, we need to find its relative major
	//
	// In C major (root = 0):
	// - ii = D minor. D minor's relative major is F. F is at offset 11. So ii appears at offset 11.
	// - iii = E minor. E minor's relative major is G. G is at offset 1. So iii appears at offset 1.
	// - vi = A minor. A minor's relative major is C. C is at offset 0. So vi appears at offset 0.
	const minorDegreeOffsets: Record<number, number> = {
		11: 2, // ii (relative major is IV)
		1: 3,  // iii (relative major is V)
		0: 6   // vi (relative major is I)
	};

	// Diminished chord: The dim shown in each segment is the leading tone (vii°) of THAT segment's major key
	// So b° appears in segment 0 (C's segment) because B is the leading tone of C
	// For C major, the vii° is B dim, which appears in segment 0 (offset 0)
	const dimDegreeOffsets: Record<number, number> = {
		0: 7   // vii° appears in the root segment
	};

	function handleClick(segmentIndex: number) {
		selectedRoot = segmentIndex;
	}

	function getFillClass(segmentIndex: number, ring: 'major' | 'minor' | 'dim'): string {
		const offset = (segmentIndex - selectedRoot + 12) % 12;

		if (ring === 'major') {
			const degree = majorDegreeOffsets[offset];
			if (degree) return degreeColors[degree];
		} else if (ring === 'minor') {
			const degree = minorDegreeOffsets[offset];
			if (degree) return degreeColors[degree];
		} else if (ring === 'dim') {
			const degree = dimDegreeOffsets[offset];
			if (degree) return degreeColors[degree];
		}

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
		{@const majorDegree = majorDegreeOffsets[(i - selectedRoot + 12) % 12]}
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
		{@const minorDegree = minorDegreeOffsets[(i - selectedRoot + 12) % 12]}
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
		{@const dimDegree = dimDegreeOffsets[(i - selectedRoot + 12) % 12]}
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
