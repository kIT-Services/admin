<script>
	import TabSelect from "../TabSelect.svelte";
	import * as marked from 'marked';
	import * as requests from '$lib/requests';
	import Spinner from "../Spinner.svelte";
    import Paginator from "../Paginator.svelte";

	/** @type { { lists: { name: string, id: string }[] } } **/
	export let data;

	/** @type { HTMLDialogElement } **/
	let subscriberDialog;

	/** @type { Promise<any[]> } **/
	let listInfo;
	let listOffset = 0;
	const listLimit = 10;

	const editorTabs = [
		{
			key: 'edit',
			title: 'Editor',
		},
		{
			key: 'prev',
			title: 'Preview',
		}
	];

	let editorTab = editorTabs[0].key;

	let markdown = '';
	let error = '';

	/**
	 * @param { Event } e
	 */
	async function sendMail(e) {
		e.preventDefault();
		if(!confirm('Send mail? This cannot be undone.')) return;

		const form = new FormData(/** @type { HTMLFormElement } **/ (e.target));
		const listId = form.get('list-id');
		const subject = form.get('subject');
		const content = marked.parse(markdown);
		try {
			await requests.post(`/maillist/${listId}`, { subject, content });
			error = 'Mail sent!';
		} catch(/** @type { any } **/ e) {
			error = e.toString();
		}
	}

	$: updateListSubscribers(listOffset, listLimit);
	function showListSubscribers() {
		updateListSubscribers(listOffset, listLimit);
		subscriberDialog.showModal();
	}

	/**
	 * @param { number } offset
	 * @param { number } limit
	 */
	function updateListSubscribers(offset, limit) {
		const selectedList = (/** @type { HTMLInputElement | null } **/ (document.getElementById('list-select')))?.value;
		if(selectedList == null) return;

		const listMeta = requests.get(`/maillist/${selectedList}`, {});
		const listSubscribers = requests.get(`/maillist/subscribers/${selectedList}`, { offset: offset.toString(), limit: limit.toString() });
		listInfo = Promise.all([ listMeta, listSubscribers ]);
	}
</script>

<h2>Mailing Lists</h2>
<hr />
<section>
	<h3>Send Newsletter</h3>
	<form on:submit={ sendMail }>
		<table>
			<tbody>
				<tr>
					<td><label for="list-select">List:</label></td>
					<td>
						<select id="list-select" name="list-id">
							{#each data.lists as list}
								<option value={ list.id }>{ list.name }</option>
							{/each}
						</select>
						<button type="button" on:click={ showListSubscribers }>Show List Subscribers</button>
					</td>
				</tr>
				<tr>
					<td><label for="subject-input">Subject:</label></td>
					<td><input id="subject-input" type="text" name="subject" required /></td>
				</tr>
			</tbody>
		</table>
		<div class="editor-header">
			<label for="content-text">Content:</label>
			<TabSelect options={ editorTabs } bind:selection={ editorTab } />
		</div>
		{#if editorTab == editorTabs[0].key}
			<textarea id="content-text" rows="25" bind:value={ markdown } required></textarea>
		{:else if editorTab == editorTabs[1].key}
			<article>{@html marked.parse(markdown)}</article>
			<i>Notice: Content may look different in emails.</i>
		{/if}
		<div>
			<button type="submit">Send</button>
			<p class="error">{ error }</p>
		</div>
	</form>
</section>

<dialog bind:this={ subscriberDialog }>
	{#if listInfo}
		{#await listInfo}
			<Spinner position="static" />
		{:then [ meta, subscribers ]}
			<h3>Subscribers for { meta.name }</h3>
			<table>
				<thead>
					<tr>
						<th>Email</th>
						<th class="num">Subscription Date</th>
					</tr>
				</thead>
				<tbody>
					{#each subscribers.items as sub}
						<tr>
							<td>{ sub.email }</td>
							<td class="num">{ new Date(sub.created).toLocaleDateString() }</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<Paginator bind:offset={ listOffset } limit={ listLimit } count={ subscribers.count } />
		{:catch err}
			<p class="error">{ err.toString() }</p>
		{/await}
	{/if}
	<form method="dialog">
		<button type="submit">Ok</button>
	</form>
</dialog>

<style>
	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	article {
		border: 1px solid var(--background-color-3);
		border-radius: 4px;
		padding: 1rem;
	}

	form[method="dialog"] {
		margin: 1rem 0;
	}

	form, table, textarea {
		width: 100%;
	}

	label {
		display: block;
		margin: 1rem 0;
	}

	textarea {
		font-family: monospace;
	}

	td, th {
		padding: 0.5em 1em;
	}

	th {
		text-align: left;
	}

	td.num, th.num {
		text-align: right;
	}
</style>
