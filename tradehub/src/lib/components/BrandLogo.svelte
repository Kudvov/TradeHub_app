<script lang="ts">
	import './BrandLogo.css';
	import brandLogoSvg from '$lib/assets/brand-logo.svg?raw';

	let {
		class: className = '',
		height = 32
	}: {
		class?: string;
		/** Высота логотипа в px; ширина подстраивается по viewBox */
		height?: number;
	} = $props();
</script>

<span
	class="brand-logo-root {className}"
	style="--brand-logo-height: {height}px"
	aria-hidden="true"
>
	{@html brandLogoSvg}
</span>
