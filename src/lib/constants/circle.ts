/**
 * Constants for the Circle of Fifths component.
 * Centralizes all magic numbers for easier maintenance and consistency.
 */

export const CIRCLE_DIMENSIONS = {
	/** SVG viewBox size (square) */
	viewBox: 400,

	/** Center point of the circle */
	center: { x: 200, y: 200 },

	/** Ring radii - outer edge of each ring */
	radii: {
		/** Outer edge of major key ring */
		outer: 185,
		/** Boundary between major and minor rings */
		mid: 135,
		/** Boundary between minor and diminished rings */
		inner: 95,
		/** Inner edge of diminished ring / outer edge of center */
		center: 65
	},

	/** Font sizes for key labels (scale with perspective) */
	fontSizes: {
		major: 18,
		minor: 14,
		dim: 11
	},

	/** Angle of each segment in degrees (360 / 12 keys) */
	segmentAngle: 30,

	/** Rotation offset to align segments correctly */
	rotationOffset: -15,

	/** Padding inside center circle for hit detection */
	centerPadding: 5
} as const;

/** Ring definitions for hit detection */
export const CIRCLE_RINGS = [
	{
		name: 'dim' as const,
		innerRadius: CIRCLE_DIMENSIONS.radii.center,
		outerRadius: CIRCLE_DIMENSIONS.radii.inner
	},
	{
		name: 'minor' as const,
		innerRadius: CIRCLE_DIMENSIONS.radii.inner,
		outerRadius: CIRCLE_DIMENSIONS.radii.mid
	},
	{
		name: 'major' as const,
		innerRadius: CIRCLE_DIMENSIONS.radii.mid,
		outerRadius: CIRCLE_DIMENSIONS.radii.outer
	}
] as const;

export type RingType = 'major' | 'minor' | 'dim';
