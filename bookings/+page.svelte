<script>
	import { toSqlDate } from '$lib/calendar';
	import * as requests from '$lib/requests';
	import EmailTemplateEditor from '../EmailTemplateEditor.svelte';
	import Paginator from '../Paginator.svelte';
	import Spinner from '../Spinner.svelte';
	import Wizard from '../Wizard.svelte';

	/** @type { any } **/
	export let data;

	const limit = 5;
	let appointmentOffset = 0;

	/** @type { Promise<any> } **/
	let appointments;
	$: appointments = requests.get('/booking/appointment', { offset: appointmentOffset.toString(), limit: limit.toString() });

	/** @type { { [key: string]: any } } **/
	let employeeInfo = {};
	$: updateEmployeeInfo(appointments)

	let appointmentTypes = requests.get('/booking/type', {});
	let workingHours = requests.get(`/booking/hours/${data.acct_id}`, {});
	let vacationDays = requests.get(`/booking/vacation/${data.acct_id}`, {});

	/** @type { { [key: string]: string } } **/
	let appointmentTypeErrors = {};

	// Wizard
	let showWizard = false;
	let wizardTitle = '';

	/** @type { { [key: string]: { name: string, type: string, required: boolean, default?: string, pattern?: string, transformer?: (v: string) => any } } } **/
	let wizardSchema = {};

	/** @type { Promise<{ [key: string]: any }> } **/
	let wizardResult;

	// Hours
	const weekdays = [
		'Sun',
		'Mon',
		'Tue',
		'Wed',
		'Thu',
		'Fri',
		'Sat',
	];

	let hoursMessage = '';

	// Vacation
	let vacationMessage = '';

	// Email Templates
	/** @type { Promise<{ count: number, list: { kind: string, template_html: string, template_plain: string }[] }> } **/
	let emailTemplates = requests.get('/templates', {});

	const placeholders = [
		{
			re: 'employee',
			description: 'Name of the employee this appointment was scheduled with.',
		},
		{
			re: 'type',
			description: 'The name of the appointment type.',
		},
		{
			re: 'date',
			description: 'The scheduled appointment date.',
		},
		{
			re: 'time',
			description: 'The scheduled appointment time.',
		},
		{
			re: 'cancel',
			description: 'The cancellation link for the appointment.',
		},
		{
			re: 'name',
			description: 'The customer\'s name.',
		},
		{
			re: 'phone',
			description: 'The customer\'s phone number.',
		},
	];

	/**
	 * @param { Promise<any> } appointments
	 */
	async function updateEmployeeInfo(appointments) {
		const appts = await appointments;
		const promises = [];
		for(const { employee } of appts.list) {
			if(employeeInfo[employee]) continue;
			employeeInfo[employee] = true;
			promises.push(requests.get(`/admin/account/${employee}`, {}));
		}

		const res = await Promise.all(promises);
		for(const account of res) {
			employeeInfo[account.id] = account;
		}
	}

	/**
	 * @param { string } s
	 * @returns { string }
	 */
	function keyToTitleCase(s) {
		return s.split('_')
			.map((v) => {
				const first = v.charAt(0);
				return `${first.toUpperCase()}${v.substring(1)}`;
			}).join(' ');
	}

	/**
	 * @param { any } appt
	 */
	async function deleteAppointment(appt) {
		if(!confirm(`Cancel this appointment? This cannot be undone! ${appt.customer_email} will be sent an email notice of this cancellation.`)) return;

		await requests.del(`/booking/appointment/${appt.id}`, {});
		appointments = requests.get('/booking/appointment', { offset: appointmentOffset.toString(), limit: limit.toString() });
	}

	async function createAppointmentType() {
		wizardTitle = 'Create New Appointment Type';
		wizardSchema = {
			name: {
				name: 'Name',
				type: 'text',
				required: true,
			},
			description: {
				name: 'Description',
				type: 'text',
				required: true,
			},
			duration_minutes: {
				name: 'Appointment Duration (minutes)',
				type: 'text',
				pattern: '^\\d+$',
				required: true,
				transformer: parseInt,
			},
			margin_minutes: {
				name: 'Appointment Margin (minutes)',
				type: 'text',
				pattern: '^\\d+$',
				required: true,
				transformer: parseInt,
			},
			remind_before_minutes: {
				name: 'Send Reminder (minutes)',
				type: 'text',
				pattern: '^\\d+$',
				required: false,
				transformer: parseInt,
			}
		};

		showWizard = true;
		try {
			const data = await wizardResult;
			await requests.post('/booking/type', data);
			appointmentTypes = requests.get('/booking/type', {});
		} catch(e) {
			console.error(e);
		}
	}

	/**
	 * @param { any } type
	*/
	async function updateAppointmentType(type) {
		try {
			await requests.patch(`/booking/type/${type.id}`, {
				name: type.name,
				description: type.description,
				duration_minutes: parseInt(type.duration_minutes),
				margin_minutes: parseInt(type.margin_minutes),
				remind_before_minutes: parseInt(type.remind_before_minutes),
				max_advance_book_days: parseInt(type.max_advance_book_days),
				min_advance_book_days: parseInt(type.min_advance_book_days),
			});

			appointmentTypes = requests.get('/booking/type', {});
			delete appointmentTypeErrors[type.id];
		} catch(/** @type { any } **/ e) {
			appointmentTypeErrors[type.id] = e.toString();
			appointmentTypeErrors = { ...appointmentTypeErrors };
		}
	}

	/**
	 * @param { string } id
	*/
	async function deleteAppointmentType(id) {
		if(!confirm('Are you sure you want to delete this appointment type? This cannot be undone!')) return;

		try {
			await requests.del(`/booking/type/${id}`, {});
			appointmentTypes = requests.get('/booking/type', {});
		} catch(e) {
			console.error(e);
		}
	}

	/**
	 * @param { Event } e
	*/
	function validateTimeInput(e) {
		const elem = (/** @type { HTMLInputElement } **/ (e.target));
		elem.value = formatTimeInput(elem.value);
	}

	/**
	 * @param { string } v
	*/
	function formatTimeInput(v) {
		const re = /^[\d:]+/;
		const ok = re.exec(v);
		v = ok ? ok[0] : '';

		const parts = v.split(':');
		if(parts.length >= 2) {
			const [ hours, minutes ] = parts;
			return `${hours.substring(0, 2)}:${minutes.substring(0, 2)}`;
		} else if(v.length > 2) {
			const hours = v.substring(0, 2);
			const minutes = v.substring(2, 4);
			return `${hours}:${minutes}`;
		} else {
			return v;
		}
	}

	/**
	 * @param { Event } e
	 */
	async function saveHours(e) {
		e.preventDefault();

		/** @type { (v: string) => string } **/
		const formatTime = (v) => {
			const parts = v.split(':').map((v) => parseInt(v));
			const time = [];
			time.push((parts[0] ?? 0) % 24);
			time.push((parts[1] ?? 0) % 60);
			time.push(0);
			return time.map((v) => v.toString().padStart(2, '0')).join(':');
		};

		const form = new FormData(/** @type { HTMLFormElement } **/ (e.target));
		const hours = [];
		for(let i = 0; i < 7; i += 1) {
			const working = !!form.get(`hours-${i}-working`);
			const start = formatTime(form.get(`hours-${i}-start`)?.toString() ?? '');
			const end = formatTime(form.get(`hours-${i}-end`)?.toString() ?? '');
			hours.push({ working, start, end });
		}

		try {
			const res = await requests.put(`/booking/hours/${data.acct_id}`, { hours });
			workingHours = Promise.resolve(res);
			hoursMessage = 'Hours saved!';
		} catch(/** @type { any } **/ e) {
			hoursMessage = e.toString();
		}
	}

	/**
	 * @param { Event } e
	*/
	function validateDateInput(e) {
		const elem = (/** @type { HTMLInputElement } **/ (e.target));
		const value = elem.value;
		const re = /^[\d-]+/;
		const test = re.exec(value);
		const valid = test ? test[0] : '';
		const parts = valid.split('-');
		if(parts.length >= 3) {
			const [ year, month, day ] = parts;
			elem.value = `${year}-${month.padStart(2, '0')}-${day.substring(0, 2)}`;
		} else if(parts.length == 2) {
			const [ year, tail ] = parts;
			if(tail.length > 2) {
				elem.value = `${year}-${tail.substring(0, 2)}-${tail.substring(2, 4)}`;
			} else {
				elem.value = `${year}-${tail}`;
			}
		} else if(valid.length > 4) {
			const year = valid.substring(0, 4);
			const month = valid.substring(4, 6);
			elem.value = `${year}-${month}`;
		}
	}

	async function createVacationDays() {
		const start = (/** @type { HTMLInputElement } **/ (document.getElementById('vacation-start-input'))).value;
		const end = (/** @type { HTMLInputElement } **/ (document.getElementById('vacation-end-input'))).value;

		const [ sy, sm, sd ] = start.split('-').map((v) => parseInt(v));
		const [ ey, em, ed ] = end.split('-').map((v) => parseInt(v));
		const startDate = new Date(sy, sm - 1, sd);
		const endDate = new Date(ey, em - 1, ed);
		if(isNaN(startDate.getTime())) {
			vacationMessage = 'Invalid start date';
			return;
		} else if(isNaN(endDate.getTime())) {
			vacationMessage = 'Invalid end date';
			return;
		}

		try {
			const res = await requests.post(`/booking/vacation/${data.acct_id}`, {
				start_date: toSqlDate(startDate),
				end_date: toSqlDate(endDate),
			});

			console.dir(res);
			vacationDays = requests.get(`/booking/vacation/${data.acct_id}`, {});
			vacationMessage = 'Vacation saved!';
		} catch(/** @type { any } **/ e) {
			vacationMessage = e.toString();
		}
	}

	/**
	 * @param { string } id
	 */
	async function deleteVacationDays(id) {
		if(!confirm('Delete these vacation days? This cannot be undone!')) return;

		try {
			await requests.del(`/booking/vacation/${id}`, {});
			vacationDays = requests.get(`/booking/vacation/${data.acct_id}`, {});
		} catch(e) {
			console.error(e);
		}
	}
</script>

<h2>Bookings</h2>
<hr />
<section>
	<h3>Appointments</h3>
	{#await appointments}
		<Spinner position='static' />
	{:then res}
		{#each res.list as appt}
			{@const extras = Object.keys(appt.extras).sort()}
			<article>
				<h4>{ appt.kind.name } ({ employeeInfo[appt.employee]?.name ?? '' })</h4>
				<table>
					<tbody>
						<tr>
							<td>Scheduled Time:</td>
							<td>{ new Date(appt.start).toLocaleString() } ({ appt.kind.duration_minutes } minutes)</td>
						</tr>
						<tr>
							<td>Customer:</td>
							<td><a href={ `mailto:${appt.customer_email}` }>{ appt.customer_email }</a></td>
						</tr>
						{#each extras as k}
							<tr>
								<td>{ keyToTitleCase(k) }:</td>
								<td>{ appt.extras[k] }</td>
							</tr>
						{/each}
					</tbody>
				</table>
				<button on:click={() => deleteAppointment(appt)}>Cancel Appointment</button>
			</article>
		{/each}
		<Paginator bind:offset={ appointmentOffset } limit={ limit } count={ res.count } />
	{:catch err}
		<p class="error">{ err.toString() }</p>
	{/await}
</section>
<section>
	<h3>Appointment Types</h3>
	{#await appointmentTypes}
		<Spinner position='static' />
	{:then res}
		{#each res.list as type}
			<article>
				<div>
					<label>
						Name:
						<input type="text" bind:value={ type.name } />
					</label>
				</div>
				<div>
					<label>
						Description:
						<textarea rows="5" cols="50" bind:value={ type.description }></textarea>
					</label>
				</div>
				<table>
					<tbody>
						<tr>
							<td>Appointment Duration (minutes):</td>
							<td><input type="text" pattern="^\d+$" bind:value={ type.duration_minutes } /></td>
						</tr>
						<tr>
							<td>Appointment Margin (minutes):</td>
							<td><input type="text" pattern="^\d+$" bind:value={ type.margin_minutes } /></td>
						</tr>
						<tr>
							<td>Remind Before (minutes):</td>
							<td><input type="text" pattern="^\d+$" bind:value={ type.remind_before_minutes } /></td>
						</tr>
						<tr>
							<td>Min. Advance Booking (days):</td>
							<td><input type="text" pattern="^\d+$" bind:value={ type.min_advance_book_days } /></td>
						</tr>
						<tr>
							<td>Max. Advance Booking (days):</td>
							<td><input type="text" pattern="^\d+$" bind:value={ type.max_advance_book_days } /></td>
						</tr>
					</tbody>
				</table>
				<button on:click={() => updateAppointmentType(type)}>Save Changes</button>
				<button on:click={() => deleteAppointmentType(type.id)}>Delete Appointment Type</button>
				<p class="error">{ appointmentTypeErrors[type.id] ?? '' }</p>
			</article>
		{/each}
		<button on:click={ createAppointmentType }>Create New Appointment Type</button>
	{:catch err}
		<p class="error">{ err.toString() }</p>
	{/await}
</section>
<section>
	<h3>Booking Email Templates</h3>
	<p>
		These templates can use <b>Markdown</b>.
		Don't know what that is?
		<a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noreferrer">Click here</a>.
	</p>

	<p>Notice: These must be set before appointments can be created.</p>
	<EmailTemplateEditor
		name="Appointment Confirmation Email Template"
		kind="appointment-scheduled"
		placeholders={ placeholders }
		templates={ emailTemplates }
	/>
	<EmailTemplateEditor
		name="Appointment Reminder Email Template"
		kind="appointment-reminder"
		placeholders={ placeholders }
		templates={ emailTemplates }
	/>

</section>
<section>
	<h3>Working Hours</h3>
	<article>
		<form on:submit={ saveHours }>
			<table>
				<tbody>
					{#await workingHours}
						<Spinner position="static" />
					{:then res}
						{@const days = res.hours.map((/** @type { { working: boolean, start: string, end: string } } **/ v) => ({
							working: v.working,
							start: formatTimeInput(v.start),
							end: formatTimeInput(v.end),
						}))}
						{#each days as day, i}
							{@const baseId = `hours-${i}`}
							<tr>
								<td><b>{ weekdays[i] }</b></td>
								<td>
									<label for={ `${baseId}-start` }>
										Start
									</label>
								</td>
								<td>
									<label for={ `${baseId}-end` }>
										End
									</label>
								</td>
							</tr>
							<tr>
								<td>
									<label>
										Working:
										<input type="checkbox" name={ `${baseId}-working` } checked={ day.working } />
									</label>
								</td>
								<td>
									<input id={ `${baseId}-start` } name={ `${baseId}-start` } type="text" value={ day.start } on:input={ validateTimeInput } />
								</td>
								<td>
									<input id={ `${baseId}-end` } name={ `${baseId}-end` } type="text" value={ day.end } on:input={ validateTimeInput } />
								</td>
							</tr>
						{/each}
					{:catch err}
						<p class="error">{ err.toString() }</p>
					{/await}
				</tbody>
			</table>
			<button type="submit">Save Changes</button>
			<p class="error">{ hoursMessage }</p>
		</form>
	</article>
</section>
<section>
	<h3>Vacation Days</h3>
	{#await vacationDays}
		<Spinner position='static' />
	{:then res}
		<article>
			<table class="vacation">
				<thead>
					<tr>
						<th>Vacation Start</th>
						<th>Vacation End</th>
					</tr>
				</thead>
				<tbody>
					{#each res.list as v}
						<tr>
							<td>{ v.start }</td>
							<td>{ v.end }</td>
							<td on:click={() => deleteVacationDays(v.id)} on:keypress={() => deleteVacationDays(v.id)}>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
									<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
								</svg>
							</td>
						</tr>
					{/each}
					<tr>
						<td>
							<input id="vacation-start-input" type="text" pattern={ "^\\d{4}-\\d{2}-\\d{2}$" } placeholder="Start Date (YYYY-MM-DD)" on:input={ validateDateInput } />
						</td>
						<td>
							<input id="vacation-end-input" type="text" pattern={ "^\\d{4}-\\d{2}-\\d{2}$" } placeholder="End Date (YYYY-MM-DD)" on:input={ validateDateInput } />
						</td>
						<td on:click={ createVacationDays } on:keypress={ createVacationDays }>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
								<path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
							</svg>
						</td>
					</tr>
					<tr>
						<td colspan="3" class="error">{ vacationMessage }</td>
					</tr>
				</tbody>
			</table>
		</article>
	{:catch err}
		<p class="error">{ err.toString() }</p>
	{/await}
</section>

<Wizard bind:show={ showWizard } title={ wizardTitle } schema={ wizardSchema } bind:result={ wizardResult } />

<style>
	.icon {
		cursor: pointer;
		width: 20px;
		height: 20px;
	}

	article {
		background-color: var(--background-color-2);
		border-radius: 4px;
		margin: 1rem 0;
		padding: 1rem;
	}

	article > h4 {
		margin: 0;
	}

	table {
		margin: 1rem 0;
	}

	table.vacation {
		border-collapse: collapse;
	}

	table.vacation td {
		border-top: 1px solid var(--text-color-2);
		color: var(--text-color-2);
		font-style: italic;
		padding: 0.5rem;
		text-align: right;
	}

	table.vacation th {
		padding: 0 1rem;
	}
</style>