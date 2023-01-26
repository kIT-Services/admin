<script>
	/** @type { number } **/
	export let offset;
	/** @type { number } **/
	export let limit;
	/** @type { number } **/
	export let count;

	const page = Math.floor(offset / limit) + 1;
	const maxPage = Math.floor(count / limit) + 1;

	/**
	 * @param { number } direction
	 */
	function changePage(direction) {
		offset = (Math.min(Math.max(page + direction, 1), maxPage) - 1) * limit;
	}
</script>

<div class="container">
	<button on:click={() => changePage(-1)}>&lt;</button>
	{ page } / { maxPage }
	<button on:click={() => changePage(1)}>&gt;</button>
</div>

<style>
	.container {
		margin: 1rem 0;
		width: 100%;
		text-align: center;
	}

	button {
		background-color: transparent;
		border: none;
	}
</style>
