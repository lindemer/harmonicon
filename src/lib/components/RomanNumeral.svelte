<script lang="ts">
	interface Props {
		numeral: string;
		inversion?: 0 | 1 | 2;
		color?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { numeral, inversion = 0, color = 'white', size = 'md' }: Props = $props();
</script>

<span class="roman-numeral {size} font-music" style:color>
	<span class="numeral">{numeral}</span>{#if inversion > 0}<span class="inversion"
			><span class="inv-top">6</span><span class="inv-bottom">{inversion === 2 ? '4' : ''}</span
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
