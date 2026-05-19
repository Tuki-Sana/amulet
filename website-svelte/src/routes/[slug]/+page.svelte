<script lang="ts">
	import DocsLayout from '$lib/components/DocsLayout.svelte';
	import { navEn } from '$lib/nav';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title || data.slug} — Amulet Docs</title>
</svelte:head>

<DocsLayout lang="en" nav={navEn} currentSlug={data.slug} headings={data.headings} title={data.title}>
	{@html data.html}
</DocsLayout>
