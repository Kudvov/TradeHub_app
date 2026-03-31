<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Админка групп — TradeHub</title>
</svelte:head>

<section class="admin-page">
	<div class="container">
		<h1 class="title">Админка: Telegram-группы</h1>
		<p class="subtitle">Добавь новую группу для парсинга и управляй текущими группами.</p>

		<form method="POST" action="?/create" class="card admin-form">
			<label class="field full">
				<span>Ссылка на новую группу</span>
				<input name="groupLink" type="text" placeholder="t.me/BatumiTradeHub или @BatumiTradeHub" required />
			</label>

			<label class="field">
				<span>Город</span>
				<select name="cityId" required>
					<option value="">Выбери город</option>
					{#each data.cities as city}
						<option value={city.id}>{city.name}</option>
					{/each}
				</select>
			</label>

			<button type="submit" class="btn btn-primary">Добавить группу</button>

			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}
			{#if form?.success}
				<p class="success">{form.message}</p>
			{/if}
		</form>

		<div class="card groups">
			<h2>Управление парсером</h2>
			{#if data.parser.available}
				<div class="parser-status">
					<span>Таймер: <strong>{data.parser.timerActive}</strong></span>
					<span>Автозапуск: <strong>{data.parser.timerEnabled}</strong></span>
					<span>Сервис: <strong>{data.parser.serviceActive}</strong></span>
					<span>Следующий запуск: <strong>{data.parser.nextRun}</strong></span>
				</div>
				<div class="parser-actions">
					<form method="POST" action="?/parserRunNow"><button type="submit">Запустить сейчас</button></form>
					<form method="POST" action="?/parserStartTimer"><button type="submit">Старт таймера</button></form>
					<form method="POST" action="?/parserStopTimer"><button type="submit">Стоп таймера</button></form>
					<form method="POST" action="?/parserEnableTimer"><button type="submit">Включить автозапуск</button></form>
					<form method="POST" action="?/parserDisableTimer"><button type="submit">Отключить автозапуск</button></form>
				</div>
			{:else}
				<p class="muted">Системные команды `systemctl` недоступны в текущем окружении.</p>
			{/if}
		</div>

		<div class="card groups">
			<h2>Текущие группы</h2>
			{#if data.groups.length === 0}
				<p class="muted">Пока нет групп.</p>
			{:else}
				<ul>
					{#each data.groups as group}
						<li>
							<strong>{group.title}</strong>
							<span>@{group.username}</span>
							<span>{group.city?.name}</span>
							<form method="POST" action="?/delete">
								<input type="hidden" name="groupId" value={group.id} />
								<button class="btn-delete" type="submit">Удалить</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</section>

<style>
	.admin-page {
		padding: 2rem 0 3rem;
	}

	.title {
		font-size: 1.5rem;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--text-muted);
		margin-bottom: 1rem;
	}

	.admin-form,
	.groups {
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		margin-bottom: 1rem;
		display: grid;
		gap: 0.75rem;
	}

	.field {
		display: grid;
		gap: 0.35rem;
	}

	.field.full {
		grid-column: 1 / -1;
	}

	input,
	select {
		border: 1px solid var(--border);
		background: var(--bg-secondary);
		border-radius: var(--radius-sm);
		padding: 0.55rem 0.65rem;
		color: var(--text-primary);
	}

	.error {
		color: #ff6b6b;
		font-size: 0.9rem;
	}

	.success {
		color: #2ecc71;
		font-size: 0.9rem;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.5rem;
	}

	li {
		display: grid;
		grid-template-columns: 1.4fr 1fr 1fr auto;
		gap: 0.5rem;
		font-size: 0.9rem;
		padding: 0.4rem 0;
		border-bottom: 1px solid var(--border);
		align-items: center;
	}

	.btn-delete {
		background: transparent;
		border: 1px solid #ff6b6b55;
		color: #ff6b6b;
		padding: 0.35rem 0.6rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.muted {
		color: var(--text-muted);
	}

	.parser-status {
		display: grid;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	.parser-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.parser-actions button {
		border: 1px solid var(--border);
		background: var(--bg-secondary);
		color: var(--text-primary);
		padding: 0.4rem 0.7rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
</style>
