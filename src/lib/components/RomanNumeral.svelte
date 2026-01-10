<script lang="ts">
	interface Props {
		numeral: string;
		inversion?: 0 | 1 | 2 | 3;
		isSeventh?: boolean;
		isNinth?: boolean;
		color?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		numeral,
		inversion = 0,
		isSeventh = false,
		isNinth = false,
		color = 'white',
		size = 'md'
	}: Props = $props();

	// Figured bass notation for triads, 7th chords, and 9th chords
	// Triads: root (none), 1st (6), 2nd (6/4)
	// 7ths: root (7), 1st (6/5), 2nd (4/3), 3rd (4/2)
	// 9ths: root (9) - only root position supported
	function getFiguredBass(
		inv: 0 | 1 | 2 | 3,
		seventh: boolean,
		ninth: boolean
	): { top: string; bottom: string } | null {
		// 9th chords only have root position (inversion is always 0)
		if (ninth) {
			return { top: '9', bottom: '' };
		}
		if (seventh) {
			switch (inv) {
				case 0:
					return { top: '7', bottom: '' };
				case 1:
					return { top: '6', bottom: '5' };
				case 2:
					return { top: '4', bottom: '3' };
				case 3:
					return { top: '4', bottom: '2' };
			}
		} else {
			switch (inv) {
				case 0:
					return null;
				case 1:
					return { top: '6', bottom: '' };
				case 2:
					return { top: '6', bottom: '4' };
				default:
					return null;
			}
		}
	}

	const figuredBass = $derived(getFiguredBass(inversion, isSeventh, isNinth));
</script>

<span class="roman-numeral {size} font-music" style:color>
	<span class="numeral">{numeral}</span>{#if figuredBass}<span class="inversion"
			><span class="inv-top">{figuredBass.top}</span><span class="inv-bottom"
				>{figuredBass.bottom}</span
			></span
		>{/if}
</span>

<style>
	.roman-numeral {
		display: inline-flex;
		align-items: center;
		line-height: 1;
	}

	.roman-numeral.sm {
		font-size: 14px;
	}
	.roman-numeral.md {
		font-size: 20px;
	}
	.roman-numeral.lg {
		font-size: 28px;
	}

	.numeral {
		line-height: 1;
	}

	.inversion {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		font-size: 0.5em;
		margin-left: 0.2em;
		margin-bottom: 0.2em;
		height: 2em;
	}

	.inv-top,
	.inv-bottom {
		line-height: 1;
	}
</style>
