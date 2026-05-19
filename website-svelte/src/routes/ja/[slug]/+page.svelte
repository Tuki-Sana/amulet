<script lang="ts">
	import DocsLayout from '$lib/components/DocsLayout.svelte';
	import { navJa } from '$lib/nav';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title || data.slug} — Amulet ドキュメント</title>
</svelte:head>

<DocsLayout lang="ja" nav={navJa} currentSlug={data.slug} headings={data.headings} title={data.title}>
	{@html data.html}
</DocsLayout>
