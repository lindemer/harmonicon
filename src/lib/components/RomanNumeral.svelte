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
	{numeral}{#if inversion > 0}<span class="inversion"
			><span>⁶</span>{#if inversion === 2}<span>₄</span>{/if}</span
		>{/if}
</span>

<style>
	.roman-numeral {
		display: inline-flex;
		align-items: baseline;
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
		vertical-align: middle;
		margin-left: 0.15em;
		width: 0.5em;
		height: 1em;
	}

	.inversion span:first-child {
		position: absolute;
		top: 0;
		left: 0;
		line-height: 1;
	}

	.inversion span:last-child:not(:first-child) {
		position: absolute;
		top: 0.4em;
		left: 0;
		line-height: 1;
	}
</style>
