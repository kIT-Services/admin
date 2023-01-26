<script>
	import { Line } from 'svelte-chartjs';
	import 'chart.js/auto';

	/** @type { string[] } **/
	export let labels;

	/** @type { { label: string, data: number[], borderColor?: string, backgroundColor?: string }[] } **/
	export let datasets;
</script>

<Line data={{ labels, datasets }} />
