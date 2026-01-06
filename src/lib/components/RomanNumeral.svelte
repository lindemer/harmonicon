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
	{numeral}{#if inversion > 0}<span class="inversion"
			><span class="inv-digit">⁶</span>{#if inversion === 2}<span class="inv-digit">₄</span
				>{/if}</span
		>{/if}
</span>

<style>
	.roman-numeral {
		display: inline-flex;
		align-items: center;
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

	.inversion {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
		font-size: 0.7em;
		line-height: 1;
		margin-left: 0.08em;
	}

	.inv-digit {
		display: block;
		line-height: 0.85;
	}

	.roman-numeral.centered .inversion {
		margin-right: -0.55em;
	}
</style>
