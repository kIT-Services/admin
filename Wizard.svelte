<script>
	/** @type { boolean } **/
	export let show;

	/** @type { string } **/
	export let title;

	/** @type { { [key: string]: { name: string, type: string, required: boolean, default?: string, pattern?: string, transformer?: (v: string) => any } } } **/
	export let schema;

	/** @type { Promise<{ [key: string]: any }> } **/
	export let result;

	/** @type { (key: string, value: string) => boolean } **/
	export let validator = () => true;

	/** @type { string } **/
	let message = '';

	/** @type { (value: { [key: string]: string }) => void } **/
	let resolve;

	/** @type { () => void } **/
	let reject;

	result = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});

	/**
	 * @param { Event } e
	 */
	function submit(e) {
		e.preventDefault();

		/** @type { { [key: string]: any } } **/
		const obj = {};
		for(const k in schema) {
			const input = /** @type { HTMLInputElement } **/ (document.getElementById(k));
			if(!validator(k, input.value)) {
				message = `${schema[k].name} has an invalid value.`;
				return;
			}

			const t = schema[k].transformer;
			if(schema[k].type == 'file') {
				obj[k] = input.files;
			} else {
				obj[k] = t ? t(input.value) : input.value;
			}
		}

		show = false;
		resolve(obj);
		result = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});
	}

	/**
	 * @param { Event } e
	*/
	function cancel(e) {
		e.preventDefault();
		e.stopPropagation();
		show = false;
		reject();
	}
</script>

{#if show}
	<div class="wizard">
		<form on:submit={ submit }>
			<h3>{ title }</h3>
			<table>
				<tbody>
					{#each Object.keys(schema) as key}
						<tr>
							<td><label for={ key }>{ schema[key].name }:</label></td>
							<td><input id={ key } type={ schema[key].type } required={ schema[key].required } value={ schema[key].default || '' } pattern={ schema[key].pattern } /></td>
						</tr>
					{/each}
				</tbody>
			</table>
			<button type="submit">Ok</button>
			<button type="button" on:click={ cancel }>Cancel</button>
			<p class="error">{ message }</p>
		</form>
	</div>
{/if}

<style>
	.wizard {
		backdrop-filter: blur(5px);
		overflow-y: auto;

		display: flex;
		justify-content: center;
		align-items: center;

		position: fixed;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
	}

	form {
		background-color: var(--background-color-1);
		border-radius: 8px;
		box-shadow: 0 0 10px #0005;
		padding: 1rem;
	}
</style>
