<script>
	import { validateEmail } from "$lib/validator";
	import * as requests from '$lib/requests'

	/** @type { string | null } **/
	let message = null;

	/** @type { boolean } **/
	let disabled = false;

	/** @param { Event } e **/
	async function onSubmit(e) {
		e.preventDefault();

		disabled = true;
		const emailInput = /** @type { HTMLInputElement } **/ (document.getElementById('email-input'));
		const email = emailInput.value;
		if(!validateEmail(email)) {
			message = 'Please enter a valid email address.';
			disabled = false;
			return;
		}

		try {
			await requests.post('/admin/session', { email, link_style: 'hash' });
			message = 'Login link sent. Please check your email.';
		} catch(/** @type { any } **/ e) {
			message = e.toString();
			disabled = false;
		}
	}
</script>

<main class="content">
	<h2>Admin Login</h2>
	<hr />
	<form on:submit={ onSubmit }>
		<label for="email-input">Email:</label>
		<input id="email-input" type="text" required />
		<button type="submit">Log In</button>
		<p class="error">{ message || '' }</p>
	</form>
</main>

<style>
	form {
		margin: 2rem auto;
		width: 40ch;

		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;
	}
</style>
