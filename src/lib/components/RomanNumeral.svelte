<script lang="ts">
	interface Props {
		numeral: string;
		inversion?: 0 | 1 | 2;
		color?: string;
		size?: 'sm' | 'md' | 'lg';
		centered?: boolean;
	}

	let { numeral, inversion = 0, color = 'white', size = 'md', centered = false }: Props = $props();
</script>

<span class="roman-numeral {size} font-music" class:centered style:color>
	<span class="numeral">{numeral}</span>{#if inversion > 0}<span class="inversion"
			><span class="inv-top">6</span><span class="inv-bottom">{inversion === 2 ? '4' : ''}</span
			></span
		>{/if}
</span>

<style>
	.roman-numeral {
		display: inline-flex;
		align-items: center;
		/* Use line-height to establish consistent height for the numeral */
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
		/* Ensure numeral has consistent height based on line-height */
		line-height: 1;
	}

	.inversion {
		display: inline-flex;
		flex-direction: column;
		justify-content: space-between;
		font-size: 0.5em;
		margin-left: 0.15em;
		/* Height matches the parent's 1em (the numeral height) */
		height: 1.9em; /* 0.95em at parent size since we're at 0.5em */
		align-self: stretch;
	}

	.inv-top,
	.inv-bottom {
		line-height: 1;
	}

	.roman-numeral.centered .inversion {
		margin-right: -0.95em;
	}
</style>
