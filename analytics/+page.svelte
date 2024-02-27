<script>
	import * as requests from '$lib/requests';
	import Spinner from '../Spinner.svelte';
	import Chart from '../Chart.svelte';
	import dummyData from './dummy.json';

	const now = new Date();
	let end = toSqlDate(now);
	let start = toSqlDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)); // JS will correct invalid dates, e.g. "2023-01-00" will convert to "2022-12-31"
	const analyticsViews = [
		'views',
		'unique_views',
		'views/%',
		'unique_views/%',
		'referrers/%',
	];

	/** @type { Promise<{ [key: string]: any[] }> } **/
	let data;
	$: {
		/** @type { { [key: string]: Promise<any> } } **/
		const promises = {};
		for(const view of analyticsViews) {
			const promise = requests.get('/analytics/view', { view, start, end });
			promises[view] = promise;
		}

		data = new Promise(async (res, rej) => {
			/** @type { { [key: string]: any[] } } **/
			const data = {};
			for(const k in promises) {
				try {
					data[k] = await promises[k];
				} catch(e) {
					rej(e);
					return;
				}
			}

			res(data);
		});
	}

	/**
	 * @param { Date } date
	 */
	function toSqlDate(date) {
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
	}

	/** @param { number } days */
	function setTimeRange(days) {
		const startTs = Date.now() - days * 86_400_000;
		start = toSqlDate(new Date(startTs));
	}

	/**
	 * @param { number } previous
	 * @param { { value: string } } current
	 * @returns { number }
	 */
	function sumReducer(previous, current) {
		return previous + parseInt(current.value);
	}

	/**
	 * @param { { view: string, value: string, date: string }[] } views
	 * @param { { view: string, value: string, date: string }[] } uniqueViews
	 * @returns { { page: string, views: number, uniqueViews: number }[] }
	 */
	function mapSiteContent(views, uniqueViews) {
		/** @type { { [view: string]: { views: number, uniqueViews: number } } } **/
		const aggregate = {};
		for(const v of views) {
			const page = v.view.substring('views'.length);
			if(!aggregate[page]) {
				aggregate[page] = {
					views: 0,
					uniqueViews: 0,
				};
			}

			aggregate[page].views += parseInt(v.value);
		}

		for(const v of uniqueViews) {
			const page = v.view.substring('unique_views'.length);
			if(!aggregate[page]) {
				aggregate[page] = {
					views: 0,
					uniqueViews: 0,
				};
			}

			aggregate[page].uniqueViews += parseInt(v.value);
		}

		/** @type { { page: string, views: number, uniqueViews: number }[] } **/
		const res = [];
		for(const page in aggregate) {
			res.push({
				page,
				views: aggregate[page].views,
				uniqueViews: aggregate[page].uniqueViews,
			});
		}

		res.sort((a, b) => b.views - a.views);
		return res.slice(0, 10);
	}

	/**
	 * @param { { view: string, value: string }[] } referrers
	 * @returns { { site: string, count: number }[] }
	 */
	function mapReferrers(referrers) {
		/** @type { { [site: string]: number } } **/
		const aggregate = {};
		for(const ref of referrers) {
			if(!ref.value) continue;
			const site = ref.value;
			if(!aggregate[site]) aggregate[site] = 0;
			aggregate[site] += 1;
		}

		/** @type { { site: string, count: number }[] } **/
		const res = [];
		for(const site in aggregate) {
			res.push({
				site,
				count: aggregate[site],
			});
		}

		res.sort((a, b) => b.count - a.count);
		return res.slice(0, 10);
	}

	/**
	 * @param { { value: string } } v
	 * @returns { number }
	 */
	function mapValue(v) {
		return parseInt(v.value);
	}
</script>

<h2>Analytics</h2>
{#await data}
	<Spinner />
{:then resolved}
	<section>
		<button on:click={() => setTimeRange(1)}>Past Day</button>
		<button on:click={() => setTimeRange(7)}>Past Week</button>
		<button on:click={() => setTimeRange(30)}>Past 30 Days</button>
		<button on:click={() => setTimeRange(365)}>Past Year</button>
		<button on:click={() => setTimeRange(1826)}>Past 5 Years</button>
	</section>
	<section>
		<h3>Summary</h3>
		<div>
			<span class="big">{ resolved['views'].reduce(sumReducer, 0) }</span> views
			&nbsp;&nbsp;&nbsp;&nbsp;
			<span class="big">{ resolved['unique_views'].reduce(sumReducer, 0) }</span> unique views
		</div>
		<Chart
			labels={ resolved['views'].map((v) => v.date) }
			datasets={[
				{
					label: 'Views',
					data: resolved['views'].map(mapValue),
					borderColor: '#f00',
				},
				{
					label: 'Unique Views',
					data: resolved['unique_views'].map(mapValue),
					borderColor: '#fa0',
				},
			]}
		/>
	</section>
	<section>
		<h3>Site Content</h3>
		<table>
			<thead>
				<tr>
					<th>Page</th>
					<th class="num">Views</th>
					<th class="num">Unique Views</th>
				</tr>
			</thead>
			<tbody>
				{#each mapSiteContent(resolved['views/%'], resolved['unique_views/%']) as p}
					<tr>
						<td><a href={ p.page } target="_blank" rel="noreferrer">{ p.page }</a></td>
						<td class="num">{ p.views }</td>
						<td class="num">{ p.uniqueViews }</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
	<section>
		<h3>Referrers</h3>
		<table>
			<thead>
				<tr>
					<th>Site</th>
					<th class="num">Count</th>
				</tr>
			</thead>
			<tbody>
				{#each mapReferrers(resolved['referrers/%']) as p}
					<tr>
						<td>{ p.site }</td>
						<td class="num">{ p.count }</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{:catch err}
	<p class="error">{ err.toString() }</p>
{/await}

<style>
	.big {
		font-size: 1.25em;
		font-weight: bold;
	}

	section {
		margin-bottom: 5rem;
	}

	table {
		border-collapse: collapse;
		width: 100%;
	}

	td, th {
		border-bottom: 1px solid #aaa;
		padding: 0.5em;
	}

	th {
		text-align: left;
	}

	td.num, th.num {
		text-align: right;
	}
</style>
