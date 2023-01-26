import { browser } from "$app/environment";
import * as requests from '$lib/requests';

export async function load(): Promise<object> {
	if(!browser) return {};

	const res = await requests.get('/maillist', {});
	const lists = res.items.map((v: any) => ({ name: v.name, id: v.id }));
	return { lists };
}
