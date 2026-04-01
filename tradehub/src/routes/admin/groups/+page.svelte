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

		{#if !data.authenticated}
			<form method="POST" action="?/login" class="card admin-form auth-form">
				<h2>Вход в админку</h2>
				<label class="field">
					<span>Логин</span>
					<input name="login" type="text" placeholder="admin" required />
				</label>
				<label class="field">
					<span>Пароль</span>
					<input name="password" type="password" placeholder="••••••••" required />
				</label>
				<button type="submit" class="btn btn-primary">Войти</button>
				{#if form?.error}
					<p class="error">{form.error}</p>
				{/if}
			</form>
		{:else}
			<form method="POST" action="?/logout" class="logout-row">
				<button type="submit" class="btn btn-secondary btn-sm">Выйти</button>
			</form>

			<div class="card parser-quick">
				<div class="parser-quick-head">
					<h2>Статус парсера</h2>
					<span class="parser-badge" class:ok={data.parser.available && data.parser.timerActive === 'active'}>
						{#if data.parser.available}
							{data.parser.timerActive === 'active' ? 'Работает' : 'Остановлен'}
						{:else}
							Недоступен
						{/if}
					</span>
				</div>
				<p class="muted">Таймер: <strong>{data.parser.timerActive}</strong></p>
				<p class="muted">Сервис: <strong>{data.parser.serviceActive}</strong></p>
				<p class="muted">Следующий запуск: <strong>{data.parser.nextRun}</strong></p>
				<form method="POST" action="?/parserRunNow">
					<button type="submit" class="btn btn-primary">Запустить парсер сейчас</button>
				</form>
			</div>

			<div class="card groups">
				<h2>Аналитика по городам</h2>
				<div class="analytics-grid">
					{#each data.cityAnalytics as row}
						<div class="analytics-card">
							<h3>{row.cityName}</h3>
							<p>Групп: <strong>{row.groups}</strong> (активных: <strong>{row.activeGroups}</strong>)</p>
							<p>Объявлений: <strong>{row.totalListings}</strong></p>
							<p>Активных: <strong>{row.activeListings}</strong></p>
							<p>Отфильтровано: <strong>{row.filteredListings}</strong></p>
							<p>За 24ч: <strong>{row.new24h}</strong></p>
						</div>
					{/each}
				</div>
			</div>

			<div class="card groups">
				<h2>Топ групп (по активным объявлениям)</h2>
				{#if data.groupAnalytics.length === 0}
					<p class="muted">Пока нет данных.</p>
				{:else}
					<ul class="analytics-list">
						{#each data.groupAnalytics as row}
							<li>
								<strong>@{row.username}</strong>
								<span>{row.cityName}</span>
								<span>Активных: {row.activeListings}</span>
								<span>Всего: {row.totalListings}</span>
								<span>Фильтр: {row.filteredListings}</span>
								<span>24ч: {row.new24h}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="card groups">
				<h2>Жалобы пользователей</h2>
				{#if data.reports.length === 0}
					<p class="muted">Открытых жалоб нет.</p>
				{:else}
					<ul class="reports-list">
						{#each data.reports as report}
							<li class="report-row">
								<div class="report-main">
									<p><strong>Причина:</strong> {report.reason}</p>
									<p><strong>Объявление:</strong> {report.listing?.title ?? 'Удалено'}</p>
									<p><strong>Город:</strong> {report.listing?.city?.name ?? '—'}</p>
									<p><strong>Контакт автора:</strong> {report.listing?.contact ?? '—'}</p>
									{#if report.details}
										<p><strong>Комментарий:</strong> {report.details}</p>
									{/if}
								</div>
								<div class="report-actions">
									<form method="POST" action="?/reportDismiss">
										<input type="hidden" name="reportId" value={report.id} />
										<button type="submit" class="btn btn-secondary btn-sm">Отклонить</button>
									</form>
									<form method="POST" action="?/reportDeleteListing">
										<input type="hidden" name="reportId" value={report.id} />
										<input type="hidden" name="listingId" value={report.listingId} />
										<button type="submit" class="btn btn-secondary btn-sm">Скрыть объявление</button>
									</form>
									<form method="POST" action="?/reportBanAuthor">
										<input type="hidden" name="reportId" value={report.id} />
										<input type="hidden" name="listingId" value={report.listingId} />
										<button type="submit" class="btn btn-primary btn-sm">Бан автора</button>
									</form>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

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
				<p class="muted cursor-hint">
					<strong>Курсор сообщения</strong> — номер поста в Telegram (как в ссылке <code>t.me/name/<em>12345</em></code>).
					Парсер идёт <strong>только вперёд</strong> (к более новым номерам), историю назад не качает.
				</p>
				{#if data.groups.length === 0}
					<p class="muted">Пока нет групп.</p>
				{:else}
					<ul class="groups-manage-list">
						{#each data.groups as group}
							<li class="group-manage-row">
								<div class="group-manage-main">
									<strong>{group.title}</strong>
									<span class="muted">@{group.username}</span>
									<span class="group-city">{group.city?.name}</span>
								</div>
								<div class="group-cursor-block">
									<span class="cursor-label" title="Последний обработанный ID (курсор)">
										Курсор: <strong>{group.lastMessageId}</strong>
									</span>
									<span class="cursor-label" title="Старт, заданный вручную (если был)">
										Старт: <strong>{group.startMessageId}</strong>
									</span>
									<form method="POST" action="?/setGroupCursor" class="cursor-form">
										<input type="hidden" name="groupId" value={group.id} />
										<label class="cursor-field">
											<span class="sr-only">ID сообщения</span>
											<input
												type="number"
												name="messageId"
												min="1"
												step="1"
												placeholder="Новый ID"
												class="cursor-input"
												required
											/>
										</label>
										<button type="submit" class="btn btn-secondary btn-sm">Применить</button>
									</form>
								</div>
								<form method="POST" action="?/delete" class="group-delete-form">
									<input type="hidden" name="groupId" value={group.id} />
									<button class="btn-delete" type="submit">Удалить</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
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

	.logout-row {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.75rem;
	}

	.auth-form {
		max-width: 420px;
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

	.analytics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.75rem;
	}

	.analytics-card {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.65rem;
		background: var(--bg-secondary);
	}

	.analytics-card h3 {
		font-size: 0.95rem;
		margin-bottom: 0.35rem;
	}

	.analytics-list li {
		grid-template-columns: 1.2fr 0.8fr 0.8fr 0.7fr 0.7fr 0.6fr;
	}

	.cursor-hint {
		font-size: 0.85rem;
		line-height: 1.45;
		margin-bottom: 0.75rem;
	}

	.cursor-hint code {
		font-size: 0.8rem;
	}

	.groups-manage-list {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.group-manage-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.75rem 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}

	.group-manage-main {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.75rem;
		align-items: baseline;
		min-width: 180px;
	}

	.group-city {
		color: var(--text-muted);
	}

	.group-cursor-block {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		flex: 1;
		min-width: 0;
	}

	.cursor-label {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.cursor-form {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
	}

	.cursor-input {
		width: 7.5rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.group-delete-form {
		margin-left: auto;
	}

	@media (max-width: 720px) {
		.group-cursor-block {
			flex-direction: column;
			align-items: flex-start;
		}

		.group-delete-form {
			margin-left: 0;
		}
	}

	.parser-quick {
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		margin-bottom: 1rem;
		display: grid;
		gap: 0.5rem;
	}

	.parser-quick-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.parser-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
		font-size: 0.75rem;
		font-weight: 600;
		background: #ff6b6b22;
		color: #ff6b6b;
	}

	.parser-badge.ok {
		background: #2ecc7122;
		color: #2ecc71;
	}

	.reports-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}

	.report-row {
		display: grid;
		gap: 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.75rem;
	}

	.report-main {
		display: grid;
		gap: 0.2rem;
	}

	.report-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
