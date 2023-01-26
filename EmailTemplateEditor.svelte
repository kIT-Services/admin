<script>
	import TabSelect from "./TabSelect.svelte";
	import { marked } from "marked";
	import * as requests from '$lib/requests';
    import { onMount } from "svelte";

	/** @type { string } **/
	export let name;

	/** @type { string } **/
	export let kind;

	/** @type { { re: string, description: string }[] } **/
	export let placeholders;

	/** @type { Promise<{ count: number, list: { kind: string, template_html: string, template_plain: string }[] }> } **/
	export let templates;

	/** @type { string } **/
	let selectedTab;

	/** @type { string } **/
	let template;

	/** @type { HTMLElement }*/
	let templatePreview;

	onMount(() => {
		templates.then((v) => template = v.list.find((v) => v.kind == kind)?.template_html ?? '');
	});

	/**
	 * @param { string } v
	 * @returns { string }
	*/
	function parseTemplatePreview(v) {
		let replaced = v;
		for(const p of placeholders) {
			replaced = replaced.replaceAll(`<${p.re}>`, `&lt;${p.re}&gt;`);
		}

		return marked.parse(replaced);
	}

	async function saveEmailTemplate() {
		const templateHtml = marked.parse(template);
		const templatePlain = templatePreview.innerText;
		try {
			await requests.put(`/templates/${kind}`, {
				template_html: templateHtml,
				template_plain: templatePlain,
			});
		} catch(e) {
			console.error(e);
		}
	}
</script>

<div class="container">
	<h4>{ name }</h4>
	<div class="template-container">
		<div>
			<TabSelect options={ [ { key: 'edit', title: 'Editor' }, { key: 'prev', title: 'Preview' } ] } bind:selection={ selectedTab } />
			<div class="v-marg">
				{#if selectedTab == 'edit'}
					<textarea rows="10" cols="50" bind:value={ template }></textarea>
				{:else if selectedTab == 'prev'}
					<div>{@html parseTemplatePreview(template ?? '')}</div>
				{/if}
				<div style="display: none;" bind:this={ templatePreview }>{@html parseTemplatePreview(template ?? '')}</div>
			</div>
		</div>
		<div>
			<h4>Placeholders:</h4>
			<table>
				<tbody>
					{#each placeholders as p}
						<tr>
							<td class="code">&lt;{ p.re }&gt;</td>
							<td>{ p.description }</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<button on:click={ saveEmailTemplate }>Save Template</button>
</div>

<style>
	.code {
		font-family: monospace;
	}

	.container {
		background-color: var(--background-color-2);
		border-radius: 4px;
		padding: 1rem;
	}

	.container h4 {
		margin: 0;
	}

	.template-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	.template-container table td {
		padding: 0.25rem;
	}

	.v-marg {
		margin: 1rem 0;
	}
</style>
