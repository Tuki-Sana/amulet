<script lang="ts">
	import type { NavGroup } from '$lib/nav';

	interface Props {
		nav: NavGroup[];
		lang: 'en' | 'ja';
		currentSlug: string;
		onNavigate?: () => void;
	}

	let { nav, lang, currentSlug, onNavigate }: Props = $props();

	const base = $derived(lang === 'ja' ? '/ja' : '');
</script>

<nav class="sidebar-nav">
	{#each nav as group}
		<div class="nav-group">
			<span class="nav-group-label">{group.label}</span>
			<ul>
				{#each group.items as item}
					<li>
						<a
							href="{base}/{item.slug}"
							class="nav-link"
							class:active={item.slug === currentSlug}
							onclick={onNavigate}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>

<style>
	.sidebar-nav {
		padding: 1rem 0;
	}

	.nav-group {
		margin-bottom: 1.5rem;
	}

	.nav-group-label {
		display: block;
		padding: 0 1rem 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #475569;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: block;
		padding: 0.4rem 1rem;
		font-size: 0.9rem;
		color: #94a3b8;
		text-decoration: none;
		border-left: 2px solid transparent;
		transition: color 0.15s, background 0.15s;
	}

	.nav-link:hover {
		color: #e2e8f0;
		background: rgba(197, 160, 89, 0.06);
	}

	.nav-link.active {
		color: #c5a059;
		background: rgba(197, 160, 89, 0.1);
		border-left-color: #c5a059;
	}
</style>
