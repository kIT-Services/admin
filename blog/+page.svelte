<script>
	import TabSelect from "../TabSelect.svelte";
	import * as requests from '$lib/requests';

	// @ts-ignore
	import * as marked from 'marked';
	import { goto } from "$app/navigation";

	const tabs = [
		{ key: 'edit', title: 'Editor' },
		{ key: 'prev', title: 'Preview' },
	];

	/** @type { string } **/
	let selectedTab;

	/** @type { string } **/
	let title = '';

	/** @type { string } **/
	let markdown = '';

	async function createPost() {
		if(!title || !markdown) return;
		if(!confirm('Create post? It will be invisible and private until you publish it.')) return;

		try {
			const res = await requests.post('/blog', {
				title,
				content: markdown,
			});

			goto(`/blog/${res.id}`);
		} catch(e) {
			console.error(e);
		}
	}
</script>
<div>
	<h2>Blog</h2>
	<TabSelect options={ tabs } bind:selection={ selectedTab } />
	{#if selectedTab == tabs[0].key}
		<div class="editor">
			<input type="text" placeholder="Post Title" bind:value={ title } />
			<textarea rows="40" placeholder="Post Content" bind:value={ markdown }></textarea>
		</div>
	{:else if selectedTab == tabs[1].key}
		<article>
			<h2>{ title || 'No Title' }</h2>
			<hr />
			{@html marked.parse(markdown || 'No content') }
		</article>
	{/if}
	<button on:click={ createPost }>Create Post</button>
</div>

<style>
	.editor {
		margin: 1rem 0;
	}

	article {
		border: 1px solid var(--background-color-3);
		border-radius: 4px;
		padding: 0 1rem;
		margin: 1rem 0;
	}

	textarea {
		box-sizing: border-box;
		font-family: monospace;
		margin: 1rem 0;
		width: 100%;
	}
</style>
