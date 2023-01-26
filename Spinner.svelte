<script>
	export let position = 'fixed';
</script>

<div class="spinner" style={ `position: ${position};` }></div>

<style>
	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}

		50% {
			transform: rotate(180deg);
		}

		100% {
			transform: rotate(360deg);
		}
	}

	.spinner {
		animation-duration: 1.5s;
		animation-iteration-count: infinite;
		animation-name: spin;
		animation-timing-function: linear;
		border: 4px solid transparent;
		border-right: 4px solid var(--highlight-color-1);
		border-radius: 50%;
		height: 2rem;
		width: 2rem;

		top: calc(50vh - 1rem);
		left: calc(50vw - 1rem);
	}
</style>
