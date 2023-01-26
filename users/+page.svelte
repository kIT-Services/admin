<script>
	import * as requests from '$lib/requests';
	import { validateEmail } from '$lib/validator';
	import Paginator from '../Paginator.svelte';
	import Spinner from '../Spinner.svelte';
	import Wizard from '../Wizard.svelte';

	let offset = 0;
	let limit = 5;

	// Wizard settings
	let mode = 'new';

	/** @type { Promise<{ [key: string]: string }> } **/
	let wizardResult;

	let showWizard = false;
	const wizardSchema = {
		email: {
			name: 'Email',
			type: 'text',
			required: true,
			default: undefined,
		},
		name: {
			name: 'Name',
			type: 'text',
			required: true,
			default: undefined,
		},
	};

	/** @type { (key: string, value: string) => boolean } **/
	const wizardValidator = (key, value) => {
		if(key == 'email') {
			return validateEmail(value);
		}

		return true;
	};

	/** @type { Promise<any> | null } **/
	let accounts = null;
	$: accounts = requests.get('/admin/account', { offset: offset.toString(), limit: limit.toString() });

	async function addUser() {
		wizardSchema.email.default = undefined;
		wizardSchema.name.default = undefined;

		mode = 'new';
		showWizard = true;
		try {
			const user = await wizardResult;
			await requests.post('/admin/account', user);
			accounts = requests.get('/admin/account', { offset: offset.toString(), limit: limit.toString() });
		} catch(e) {}
	}

	/**
	 * @param { any } user
	 */
	async function modifyUser(user) {
		wizardSchema.email.default = user.email;
		wizardSchema.name.default = user.name;

		mode = 'modify';
		showWizard = true;
		try {
			const updated = await wizardResult;
			await requests.patch(`/admin/account/${user.id}`, updated);
			accounts = requests.get('/admin/account', { offset: offset.toString(), limit: limit.toString() });
		} catch(e) {}
	}

	/**
	 * @param { string } id
	*/
	async function deleteUser(id) {
		if(!confirm('Are you sure you want to delete this user? They will no longer be able to log in and this cannot be undone!')) return;
		try {
			await requests.del(`/admin/account/${id}`, {});
			accounts = requests.get('/admin/account', { offset: offset.toString(), limit: limit.toString() });
		} catch(e) {
			console.error(e);
		}
	}
</script>

<h2>User Management</h2>
{#await accounts}
	<Spinner />
{:then res}
	<i>Showing { offset + 1 } to { Math.min(offset + limit, res.count) } of { res.count } users.</i>
	<button style="float: right;" on:click={ addUser }>Add User</button>
	{#each res.list as user}
		<table class="user">
			<tbody>
				<tr>
					<td>Email:</td>
					<td>{ user.email }</td>
				</tr>
				<tr>
					<td>Name:</td>
					<td>{ user.name }</td>
				</tr>
				<tr>
					<td>Created:</td>
					<td>{ new Date(user.created).toLocaleString() }</td>
				</tr>
				<tr>
					<td>
						<button on:click={() => modifyUser(user)}>Modify User</button>
					</td>
					<td>
						<button on:click={() => deleteUser(user.id)}>Delete User</button>
					</td>
				</tr>
				<tr>
					<td colspan="2">
						<code class="debug">{ user.org }/{ user.id }</code>
					</td>
				</tr>
			</tbody>
		</table>
	{/each}
	<Paginator bind:offset limit={ limit } count={ res.count } />
{:catch err}
	<p class="error">{ err.toString() }.</p>
{/await}

<Wizard bind:show={ showWizard } title={ mode == 'new' ? 'Create User' : 'Update User Info' } schema={ wizardSchema } bind:result={ wizardResult } validator={ wizardValidator } />

<style>
	.debug {
		font-size: 8pt;
	}

	table.user {
		background-color: var(--background-color-2);
		border-radius: 4px;
		box-sizing: border-box;
		margin: 2rem 0;
		padding: 1rem;
		width: 100%;
	}

	table.user td {
		padding: 0.5rem;
	}
</style>
