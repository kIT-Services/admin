import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import * as requests from '$lib/requests';

export async function load() {
	if(!browser || window.location.pathname == '/admin/login') return;

	const adminSession = localStorage.getItem('admin-session-id');
	if(!adminSession) throw redirect(307, '/admin/login');

	try {
		const session = await requests.get(`/admin/session/${adminSession}`, {});
		return session;
	} catch(e: any) {
		console.error(e.toString());
		throw redirect(307, '/admin/login');
	}
}
