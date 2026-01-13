<script lang="ts">
	interface Props {
		numeral: string;
		bassNote?: string;
		inversion?: 0 | 1 | 2 | 3;
		isSeventh?: boolean;
		isNinth?: boolean;
		color?: string;
		size?: 'sm' | 'md' | 'lg';
		displayMode?: 'roman' | 'letter';
	}

	let {
		numeral,
		bassNote,
		inversion = 0,
		isSeventh = false,
		isNinth = false,
		color = 'var(--text-primary)',
		size = 'md',
		displayMode = 'roman'
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

	// Letter mode chord suffix (7, 9, etc.)
	function getLetterSuffix(seventh: boolean, ninth: boolean): string {
		if (ninth) return '9';
		if (seventh) return '7';
		return '';
	}

	const letterSuffix = $derived(getLetterSuffix(isSeventh, isNinth));
</script>

{#if displayMode === 'letter'}
	{#if bassNote}
		<!-- Fraction/stacked display for slash chords -->
		<span class="chord-fraction {size} font-music" style:color>
			<span class="fraction-top">{@html numeral}</span>
			<span class="fraction-line"></span>
			<span class="fraction-bottom">{bassNote}</span>
		</span>
	{:else}
		<span class="chord {size} font-music" style:color>
			<span class="chord-root">{@html numeral}</span>
		</span>
	{/if}
{:else}
	<span class="roman-numeral {size} font-music" style:color>
		<span class="numeral">{numeral}</span>{#if figuredBass}<span class="inversion"
				><span class="inv-top">{figuredBass.top}</span><span class="inv-bottom"
					>{figuredBass.bottom}</span
				></span
			>{/if}
	</span>
{/if}

<style>
	/* Letter chord mode styles */
	.chord {
		display: inline-flex;
		align-items: baseline;
		line-height: 1;
	}

	.chord.sm {
		font-size: 14px;
	}
	.chord.md {
		font-size: 20px;
	}
	.chord.lg {
		font-size: 28px;
	}

	.chord-root {
		line-height: 1;
	}

	/* Fraction/stacked slash chord styles */
	.chord-fraction {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1;
		overflow: visible;
	}

	.chord-fraction.sm {
		font-size: 14px;
	}
	.chord-fraction.md {
		font-size: 20px;
	}
	.chord-fraction.lg {
		font-size: 28px;
	}

	.fraction-top,
	.fraction-bottom {
		line-height: 1.2;
		display: flex;
		align-items: baseline;
		overflow: visible;
	}

	.fraction-top :global(sup),
	.chord-root :global(sup) {
		font-size: 0.65em;
	}

	.fraction-line {
		width: 100%;
		height: 1px;
		background-color: currentColor;
		margin: 1px 0;
	}

	/* Roman numeral mode styles */
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
