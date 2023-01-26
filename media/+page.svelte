<script>
	import * as requests from '$lib/requests';
	import { prefixSI } from '$lib/strings';
	import Paginator from '../Paginator.svelte';
	import Spinner from '../Spinner.svelte';
	import Wizard from '../Wizard.svelte';

	const limit = 100;
	let offset = 0;

	/** @type { { id: string, size_bytes: number, content_type: string, created: string } | null } **/
	let selectedFile = null;

	/** @type { Promise<{ count: number, list: { id: string, size_bytes: number, content_type: string, created: string }[] }> } **/
	let media;
	$: media = requests.get('/media', { offset: offset.toString(), limit: limit.toString() });

	/** @type { Promise<{ [key: string]: FileList }> } **/
	let uploadResult;
	let showUploadWizard = false;
	let uploadError = '';
	const uploadWizardSchema = {
		file: {
			name: 'File',
			type: 'file',
			required: true,
		},
	};

	async function deleteSelectedFile() {
		if(!confirm('Are you sure you want to delete this file? This cannot be undone!')) return;

		try {
			await requests.del(`/media/${selectedFile?.id}`, {});
			media = requests.get('/media', { offset: offset.toString(), limit: limit.toString() });
		} catch(e) {
			console.error(e);
		}
	}

	async function copyPermalink() {
		try {
			const permalink = `${requests.api}/media/${selectedFile?.id}`;
			await navigator.clipboard.writeText(permalink);
			alert(`Copied ${permalink} to the clipboard.`); // I'm being lazy.
		} catch(e) {
			console.error(e);
		}
	}

	async function uploadMedia() {
		showUploadWizard = true;

		/** @type { File } **/
		let file;
		try {
			const res = await uploadResult;
			file = res.file[0];
		} catch(e) {
			console.error(e);
			return;
		}

		/** @type { string } **/
		let fileId;
		try {
			fileId = await requests.upload('/media', file);
			uploadError = '';
		} catch(/** @type { any } **/ e) {
			uploadError = 'File is too large.';
			return;
		}

		media = requests.get('/media', { offset: offset.toString(), limit: limit.toString() });
		selectedFile = /** @type { { id: string, size_bytes: number, content_type: string, created: string } } **/ ((await media).list.find((v) => v.id == fileId));
	}
</script>

<h2>Media</h2>
<hr />
{#await media}
	<Spinner />
{:then res}
	<div class="container">
		<section class="files">
			{#each res.list as file}
				<button class={ file.id == selectedFile?.id ? 'selected' : '' } on:click={() => selectedFile = file}>
					{ file.id }
				</button>
			{/each}
			<button on:click={ uploadMedia }>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
					<path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
					<path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
				</svg>
			</button>
			<p class="error">{ uploadError }</p>
			<Paginator bind:offset={ offset } limit={ limit } count={ res.count } />
		</section>
		<section class="preview">
			{#if selectedFile}
				{#if selectedFile.content_type.startsWith('image/')}
					<img alt="File preview" src={ `${requests.api}/media/${selectedFile.id}` } />
				{:else if selectedFile.content_type.startsWith('text/')}
					{#await fetch(`${requests.api}/media/${selectedFile.id}`)}
						<Spinner position="static" />
					{:then req}
						{#await req.text()}
							<Spinner position="static" />
						{:then res}
							<pre>{ res }</pre>
						{:catch err}
							<p class="error">{ err.toString() }</p>
						{/await}
					{:catch err}
						<p class="error">{ err.toString() }</p>
					{/await}
				{:else}
					<p>Cannot preview file.</p>
				{/if}

				<div class="tools">
					<button on:click={ deleteSelectedFile }>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
						</svg>
					</button>
					<button on:click={ copyPermalink }>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
						</svg>
					</button>
				</div>
			{:else}
				<p>No file selected.</p>
			{/if}
		</section>
	</div>
{:catch err}
	<p class="error">{ err.toString() }</p>
{/await}

<Wizard bind:show={ showUploadWizard } title="Upload Media" schema={ uploadWizardSchema } bind:result={ uploadResult } />

<style>
	.container {
		height: 70vh;

		display: flex;
		gap: 1ch;
	}

	.icon {
		width: 20px;
		height: 20px;
	}

	.preview {
		border: 1px solid var(--background-color-3);
		border-radius: 4px;
		flex-grow: 1;
		position: relative;

		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preview > .tools {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
	}

	.preview > .tools button {
		display: inline;
		margin: 4px;
		padding: 4px;
		width: 34px;
		height: 34px;
	}

	.preview > img {
		border-radius: 4px;
		max-height: 90%;
		max-width: 90%;
	}

	button {
		background-color: transparent;
		border: 1px solid var(--highlight-color-1);
		display: block;
		font-size: 0.8rem;
		margin: 0.5rem 0;
		transition: background-color 0.2s;
		width: 100%;
	}

	button.selected {
		background-color: var(--highlight-color-1);
	}
</style>
