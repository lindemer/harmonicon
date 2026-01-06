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
		position: relative;
		display: inline-block;
		font-size: 0.85em;
		margin-left: 0.15em;
		width: 0.6em;
		height: 1.2em;
	}

	.inv-digit {
		position: absolute;
		left: 0;
		line-height: 1;
	}

	.inv-digit:first-child {
		top: -0.05em;
	}

	.inv-digit:last-child:not(:first-child) {
		top: 0.25em;
	}

	.roman-numeral.centered .inversion {
		margin-right: -0.55em;
	}
</style>
