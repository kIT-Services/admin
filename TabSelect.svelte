<script>
	/** @type { { key: string, title: string }[] } **/
	export let options;

	/** @type { string } **/
	export let selection = options[0].key;
</script>

<div class="container">
	{#each options as opt}
		<button type="button" class={ selection == opt.key ? 'selected' : '' } on:click={() => selection = opt.key}>{ opt.title }</button>
	{/each}
</div>

<style>
	.container {
		display: flex;
		gap: 1em;
	}

	button {
		border: 1px solid var(--highlight-color-1);
		transition: background-color 0.2s;
	}

	button.selected {
		background-color: transparent;
	}
</style>
