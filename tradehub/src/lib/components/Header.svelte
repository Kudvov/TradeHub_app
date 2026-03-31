<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';

	let { currentCity = '' }: { currentCity?: string } = $props();
</script>

<header class="header">
	<div class="container header-inner">
		<a href="/" class="logo" id="header-logo">
			<span class="logo-icon">⚡</span>
			<span class="logo-text">Trade<span class="logo-accent">Hub</span></span>
		</a>

		<nav class="header-nav" id="header-nav">
			{#if currentCity}
				<a href="/" class="nav-link" id="nav-all-cities">
					<span class="nav-icon">🏙</span>
					Все города
				</a>
			{/if}
		</nav>

		<div class="header-actions">
			<ThemeToggle />
			<span class="badge badge-success" id="header-status">
				<span class="status-dot"></span>
				Online
			</span>
		</div>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--header-glass);
		backdrop-filter: blur(16px) saturate(180%);
		border-bottom: 1px solid var(--border);
		transition: background var(--transition-base);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
		gap: 1rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--text-primary);
		font-weight: 700;
		font-size: 1.25rem;
		letter-spacing: -0.02em;
	}

	.logo:hover {
		color: var(--text-primary);
	}

	.logo-icon {
		font-size: 1.5rem;
		filter: drop-shadow(0 0 6px var(--accent-glow));
	}

	.logo-accent {
		background: linear-gradient(135deg, var(--accent), #3bb0ff);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		transition: all var(--transition-fast);
	}

	.nav-link:hover {
		background: var(--accent-subtle);
		color: var(--accent);
	}

	.nav-icon {
		font-size: 1rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--success);
		box-shadow: 0 0 6px var(--success);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
