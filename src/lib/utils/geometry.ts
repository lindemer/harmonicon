/**
 * Geometry utilities for SVG coordinate transformations and shape calculations.
 * Used primarily by CircleOfFifths for hit detection and arc rendering.
 */

export interface Point {
	x: number;
	y: number;
}

/**
 * Convert client (mouse/touch) coordinates to SVG coordinates.
 * Handles the transformation from screen space to SVG viewBox space.
 */
export function clientToSvgCoords(
	clientX: number,
	clientY: number,
	svg: SVGSVGElement,
	viewBoxSize: number
): Point {
	const rect = svg.getBoundingClientRect();
	const x = clientX - rect.left;
	const y = clientY - rect.top;
	return {
		x: (x / rect.width) * viewBoxSize,
		y: (y / rect.height) * viewBoxSize
	};
}

/**
 * Calculate distance from a point to a center point.
 */
export function getDistanceFromCenter(point: Point, center: Point): number {
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle (in degrees) from center to a point.
 * Returns 0-360 degrees, with 0 at top (12 o'clock position).
 */
export function getAngleFromCenter(point: Point, center: Point, rotationOffset: number = 0): number {
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	let angle = Math.atan2(dy, dx) * (180 / Math.PI);
	// Convert from standard angle (0 = right, counter-clockwise) to circle angle (0 = top, clockwise)
	angle = (angle + 90 + 360) % 360;
	// Apply rotation offset
	angle = (angle - rotationOffset + 360) % 360;
	return angle;
}

/**
 * Convert polar coordinates to Cartesian (x, y).
 * Angle is in degrees, with 0 at top (12 o'clock position).
 */
export function polarToCartesian(
	centerX: number,
	centerY: number,
	radius: number,
	angleInDegrees: number
): Point {
	const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
	return {
		x: centerX + radius * Math.cos(angleInRadians),
		y: centerY + radius * Math.sin(angleInRadians)
	};
}

/**
 * Generate SVG path data for an arc segment (like a pie slice with a hole).
 * Used for drawing ring segments in the Circle of Fifths.
 */
export function describeArc(
	centerX: number,
	centerY: number,
	innerRadius: number,
	outerRadius: number,
	startAngle: number,
	endAngle: number
): string {
	const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
	const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
	const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
	const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);

	const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

	return [
		'M', outerStart.x, outerStart.y,
		'A', outerRadius, outerRadius, 0, largeArcFlag, 1, outerEnd.x, outerEnd.y,
		'L', innerEnd.x, innerEnd.y,
		'A', innerRadius, innerRadius, 0, largeArcFlag, 0, innerStart.x, innerStart.y,
		'Z'
	].join(' ');
}

/**
 * Get the segment index (0-11) for a point on the circle.
 * Used for determining which key is being hovered/clicked.
 */
export function getSegmentFromAngle(angle: number, segmentAngle: number): number {
	return Math.floor(angle / segmentAngle);
}

/**
 * Determine which ring a point is in based on distance from center.
 * Returns null if outside all rings or in the center hole.
 */
export function getRingFromDistance<T extends string>(
	distance: number,
	rings: readonly { readonly name: T; readonly innerRadius: number; readonly outerRadius: number }[]
): T | null {
	for (const ring of rings) {
		if (distance >= ring.innerRadius && distance < ring.outerRadius) {
			return ring.name;
		}
	}
	return null;
}
