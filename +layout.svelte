<script>
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import Spinner from "./Spinner.svelte";
	import * as requests from '$lib/requests';

	/** @type { any } **/
	export let data;

	async function logout() {
		const sessionId = localStorage.getItem('admin-session-id');
		localStorage.removeItem('admin-session-id');
		try {
			await requests.del(`/admin/session/${sessionId}`, {});
		} catch(e) {
			console.error(e);
		}
	
		goto('/admin/login');
	}
</script>

<svelte:head>
	<title>Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.acct_id}
	<main>
		<div class="menu">
			<h4>Menu</h4>
			<div class="nav-item"><a href="/admin/analytics">Analytics</a> 📈</div>
			<div class="nav-item"><a href="/admin/blog">Blog</a> 🖋️</div>
			<div class="nav-item"><a href="/admin/bookings">Bookings</a> 📅</div>
			<div class="nav-item"><a href="/admin/mail">Mailing lists</a> ✉️</div>
			<div class="nav-item"><a href="/admin/media">Media</a> 📷</div>
			{#if data.is_root}
				<div class="nav-item"><a href="/admin/users">User Management</a> 🧑‍💼</div>
			{/if}

			<button on:click={ logout }>Log Out</button>
		</div>
		<div class="content">
			<slot></slot>
		</div>
	</main>
{:else if browser && window.location.pathname == '/admin/login'}
	<slot></slot>
{:else}
	<Spinner />
{/if}

<style>
	.content {
		overflow: auto;
		padding: 1rem;
	}

	.menu {
		background-color: var(--background-color-4);
		color: var(--text-color-4);
		padding: 1rem;
	}

	.nav-item {
		margin: 1rem 0;
	}

	main {
		height: calc(100vh - 5rem);

		display: grid;
		grid-template-columns: 20ch 1fr;
	}
</style>