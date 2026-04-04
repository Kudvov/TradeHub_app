<script lang="ts">
	import './admin-groups.css';
	import type { PageData, ActionData } from './$types';
	import { onMount } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type AdminTab = 'parser' | 'logs' | 'groups' | 'stats' | 'reports' | 'ai' | 'docs';

	type LivePayload = {
		ok: true;
		new5m: number;
		new15m: number;
		new60m: number;
		parserService: string;
		parserRunning: boolean;
		at: string;
	};

	let tab = $state<AdminTab>('parser');
	let live = $state<LivePayload | null>(null);
	let liveFetchState = $state<'idle' | 'loading' | 'error'>('idle');

	type OllamaStats = {
		ok: true;
		ollama: {
			online: boolean;
			models: { name: string; size: number; modifiedAt: string }[];
			running: { name: string; sizeVram: number }[];
		};
		categoryStats: { slug: string; name: string; count: number }[];
		uncategorized: number;
		total: number;
		at: string;
	};
	let ollamaStats = $state<OllamaStats | null>(null);
	let ollamaFetchState = $state<'idle' | 'loading' | 'error'>('idle');

	let parserLogText = $state(data.parserLog ?? '');
	let logRefreshing = $state(false);
	let logFeedback = $state('');
	/** Чтобы не затирать лог после «Обновить лог», пока с сервера не пришла новая строка load() */
	let lastServerParserLog = $state(data.parserLog ?? '');

	$effect(() => {
		const next = data.parserLog ?? '';
		if (next === lastServerParserLog) return;
		lastServerParserLog = next;
		parserLogText = next;
	});

	onMount(() => {
		const saved = sessionStorage.getItem('teleposter_admin_tab');
		if (
			saved === 'parser' ||
			saved === 'logs' ||
			saved === 'groups' ||
			saved === 'stats' ||
			saved === 'reports' ||
			saved === 'ai' ||
			saved === 'docs'
		) {
			tab = saved;
		}

		if (!data.authenticated) return;

		let cancelled = false;
		let unauthorized = false;

		async function pull() {
			if (unauthorized || cancelled) return;
			liveFetchState = live === null ? 'loading' : 'idle';
			try {
				const res = await fetch('/api/admin/live-status', { credentials: 'include' });
				if (res.status === 401) {
					unauthorized = true;
					liveFetchState = 'error';
					return;
				}
				if (!res.ok) {
					liveFetchState = 'error';
					return;
				}
				const body = (await res.json()) as LivePayload;
				if (!cancelled && body?.ok) {
					live = body;
					liveFetchState = 'idle';
				}
			} catch {
				if (!cancelled) liveFetchState = 'error';
			}
		}

		void pull();
		const id = setInterval(pull, 3000);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	});

	function setTab(next: AdminTab) {
		tab = next;
		sessionStorage.setItem('teleposter_admin_tab', next);
	}

	function formatLiveTime(iso: string) {
		try {
			return new Date(iso).toLocaleTimeString('ru-RU', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return '—';
		}
	}

	async function fetchLogSilent(): Promise<void> {
		if (logRefreshing) return;
		try {
			const res = await fetch(`/api/admin/parser-logs?t=${Date.now()}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!res.ok) return;
			const body = (await res.json()) as { log?: string };
			parserLogText = body.log ?? '';
		} catch {
			// тихо игнорируем
		}
	}

	$effect(() => {
		if (tab !== 'logs' || !data.authenticated) return;
		void fetchLogSilent();
		const id = setInterval(() => void fetchLogSilent(), 15_000);
		return () => clearInterval(id);
	});

	async function fetchOllamaStats() {
		ollamaFetchState = ollamaStats === null ? 'loading' : 'idle';
		try {
			const res = await fetch('/api/admin/ollama-stats', { credentials: 'include' });
			if (!res.ok) { ollamaFetchState = 'error'; return; }
			ollamaStats = await res.json();
			ollamaFetchState = 'idle';
		} catch {
			ollamaFetchState = 'error';
		}
	}

	$effect(() => {
		if (tab !== 'ai' || !data.authenticated) return;
		void fetchOllamaStats();
		const id = setInterval(() => void fetchOllamaStats(), 15_000);
		return () => clearInterval(id);
	});

	function formatBytes(bytes: number): string {
		if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' ГБ';
		if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' МБ';
		return bytes + ' Б';
	}

	async function refreshParserLog() {
		logFeedback = '';
		logRefreshing = true;
		try {
			const res = await fetch(`/api/admin/parser-logs?t=${Date.now()}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (res.status === 401) {
				logFeedback = 'Сессия истекла — обновите страницу и войдите снова.';
				return;
			}
			if (!res.ok) {
				logFeedback = 'Не удалось загрузить лог.';
				return;
			}
			const body = (await res.json()) as { log?: string };
			parserLogText = body.log ?? '';
			logFeedback = 'Лог обновлён.';
			setTimeout(() => {
				logFeedback = '';
			}, 2000);
		} catch {
			logFeedback = 'Ошибка сети при загрузке лога.';
		} finally {
			logRefreshing = false;
		}
	}

	async function copyParserLog() {
		logFeedback = '';
		try {
			await navigator.clipboard.writeText(parserLogText || '');
			logFeedback = 'Скопировано в буфер — можно вставить в чат.';
			setTimeout(() => {
				logFeedback = '';
			}, 3500);
		} catch {
			logFeedback = 'Не удалось скопировать (браузер заблокировал доступ к буферу).';
		}
	}
</script>

<svelte:head>
	<title>Админка — teleposter</title>
</svelte:head>

<section class="admin-page">
	<div class="container">
		<h1 class="title">Админка</h1>
		<p class="subtitle">
			Управление парсером Telegram, группами, аналитикой и жалобами. На проде команды парсера доступны только если процесс
			SvelteKit запущен с правами на <code class="inline-code">systemctl</code> (как на VPS).
		</p>

		{#if !data.authenticated}
			<form method="POST" action="?/login" class="card admin-form auth-form">
				<h2>Вход</h2>
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

			{#if form?.error}
				<p class="card flash flash-error">{form.error}</p>
			{/if}
			{#if form?.success && form?.message}
				<p class="card flash flash-success">{form.message}</p>
			{/if}

			<div class="admin-tablist" role="tablist" aria-label="Разделы админки">
				<button
					type="button"
					role="tab"
					class="admin-tab"
					class:active={tab === 'parser'}
					aria-selected={tab === 'parser'}
					onclick={() => setTab('parser')}
				>
					Парсер
				</button>
				<button
					type="button"
					role="tab"
					class="admin-tab"
					class:active={tab === 'logs'}
					aria-selected={tab === 'logs'}
					onclick={() => setTab('logs')}
				>
					Логи
				</button>
				<button
					type="button"
					role="tab"
					class="admin-tab"
					class:active={tab === 'groups'}
					aria-selected={tab === 'groups'}
					onclick={() => setTab('groups')}
				>
					Группы
				</button>
				<button
					type="button"
					role="tab"
					class="admin-tab"
					class:active={tab === 'stats'}
					aria-selected={tab === 'stats'}
					onclick={() => setTab('stats')}
				>
					Аналитика
				</button>
				<button
					type="button"
					role="tab"
					class="admin-tab"
					class:active={tab === 'reports'}
					aria-selected={tab === 'reports'}
					onclick={() => setTab('reports')}
				>
					Жалобы
					{#if data.reports.length > 0}
						<span class="tab-badge">{data.reports.length}</span>
					{/if}
				</button>
				<button
					type="button"
					role="tab"
					class="admin-tab"
					class:active={tab === 'ai'}
					aria-selected={tab === 'ai'}
					onclick={() => setTab('ai')}
				>
					AI
				</button>
				<button
					type="button"
					role="tab"
					class="admin-tab"
					class:active={tab === 'docs'}
					aria-selected={tab === 'docs'}
					onclick={() => setTab('docs')}
				>
					Справка
				</button>
			</div>

			<div class="card admin-live-strip" aria-live="polite">
				<div class="admin-live-parser">
					{#if liveFetchState === 'loading' && live === null}
						<span class="admin-spinner admin-spinner--always" aria-hidden="true"></span>
						<span class="admin-live-parser-text muted">Загрузка счётчиков…</span>
					{:else if liveFetchState === 'error' && live === null}
						<span class="admin-live-parser-text muted">Не удалось загрузить live-данные.</span>
					{:else if live}
						<span
							class="admin-spinner"
							class:admin-spinner--active={live.parserRunning}
							aria-hidden="true"
						></span>
						<div class="admin-live-parser-copy">
							<strong class="admin-live-parser-title">
								{#if live.parserRunning}
									Парсер сейчас выполняется
								{:else if live.parserService === 'n/a' || live.parserService === ''}
									Статус парсера (systemctl) недоступен
								{:else}
									Парсер в простое
								{/if}
							</strong>
							<span class="muted small">
								Юнит: <code class="inline-code">{live.parserService}</code>
								{#if live.parserRunning}
									— идёт синхронизация, счётчики обновятся по мере записи в БД.
								{/if}
							</span>
						</div>
					{:else}
						<span class="muted small">Live-данные появятся после входа.</span>
					{/if}
				</div>
				<div class="admin-live-counts">
					<span class="admin-live-counts-label">Новых объявлений в БД</span>
					{#if live}
						<div class="admin-live-counts-grid">
							<span><strong>{live.new5m}</strong> за 5 мин</span>
							<span><strong>{live.new15m}</strong> за 15 мин</span>
							<span><strong>{live.new60m}</strong> за час</span>
						</div>
						<span class="muted small admin-live-updated">Обновлено: {formatLiveTime(live.at)} · опрос каждые 3 с</span>
					{:else if liveFetchState !== 'error'}
						<span class="muted small">—</span>
					{/if}
				</div>
			</div>

			{#if tab === 'parser'}
				<div class="tab-panel" role="tabpanel">
					<div class="card parser-summary">
						<div class="parser-quick-head">
							<h2>Состояние systemd</h2>
							<span
								class="parser-badge"
								class:ok={data.parser.available && data.parser.timerActive === 'active'}
							>
								{#if data.parser.available}
									{data.parser.timerActive === 'active' ? 'Таймер активен' : 'Таймер не активен'}
								{:else}
									systemctl недоступен
								{/if}
							</span>
						</div>
						<dl class="parser-dl">
							<div>
								<dt>teleposter-parser.timer (is-active)</dt>
								<dd><strong>{data.parser.timerActive}</strong></dd>
							</div>
							<div>
								<dt>teleposter-parser.timer (is-enabled)</dt>
								<dd><strong>{data.parser.timerEnabled}</strong> — автозапуск после перезагрузки</dd>
							</div>
							<div>
								<dt>teleposter-parser.service (is-active)</dt>
								<dd>
									<strong>{data.parser.serviceActive}</strong>
									<span class="muted small"
										>oneshot: «activating» во время прогона, затем обычно inactive</span
									>
								</dd>
							</div>
							<div>
								<dt>Следующий запуск по таймеру</dt>
								<dd><strong>{data.parser.nextRun}</strong></dd>
							</div>
						</dl>
					</div>

					{#if data.parser.available}
						<div class="card parser-section">
							<h3>Запуск и остановка синхронизации</h3>
							<p class="muted small">
								Юнит <code class="inline-code">teleposter-parser.service</code> — тот же, что запускает таймер:
								<code class="inline-code">npm run parser:sync</code> с блокировкой
								<code class="inline-code">flock</code>. Пока идёт прогон, повторный старт из таймера тихо пропускается.
							</p>
							<div class="parser-actions">
								<form method="POST" action="?/parserRunNow">
									<button type="submit" class="btn btn-primary">Запустить парсер сейчас</button>
								</form>
								<form
									method="POST"
									action="?/parserStopService"
									onsubmit={(e) => {
										if (
											!confirm(
												'Остановить текущий прогон парсера? Процесс получит SIGTERM; курсоры в БД уже могли быть сохранены.'
											)
										)
											e.preventDefault();
									}}
								>
									<button type="submit" class="btn btn-secondary">Остановить прогон</button>
								</form>
								<form
									method="POST"
									action="?/parserRestartService"
									onsubmit={(e) => {
										if (
											!confirm(
												'Перезапустить парсер? Текущий прогон будет остановлен и сразу начнётся новый.'
											)
										)
											e.preventDefault();
									}}
								>
									<button type="submit" class="btn btn-secondary">Перезапустить парсер</button>
								</form>
							</div>
						</div>

						<div class="card parser-section">
							<h3>Таймер</h3>
							<p class="muted small">
								Управление планировщиком <code class="inline-code">teleposter-parser.timer</code> (на сервере обычно
								каждую минуту после завершения предыдущего запуска).
							</p>
							<div class="parser-actions">
								<form method="POST" action="?/parserStartTimer">
									<button type="submit" class="btn btn-secondary">Старт таймера</button>
								</form>
								<form method="POST" action="?/parserStopTimer">
									<button type="submit" class="btn btn-secondary">Стоп таймера</button>
								</form>
							</div>
						</div>

						<div class="card parser-section">
							<h3>Автозапуск при загрузке ОС</h3>
							<p class="muted small">
								<code class="inline-code">enable</code> / <code class="inline-code">disable</code> для юнита таймера.
							</p>
							<div class="parser-actions">
								<form method="POST" action="?/parserEnableTimer">
									<button type="submit" class="btn btn-secondary">Включить автозапуск</button>
								</form>
								<form method="POST" action="?/parserDisableTimer">
									<button type="submit" class="btn btn-secondary">Отключить автозапуск</button>
								</form>
							</div>
						</div>

						<div class="card parser-section">
							<h3>Диагностика</h3>
							<p class="muted small">
								Если юнит ушёл в <code class="inline-code">failed</code>, сбросьте состояние. Полный журнал — на вкладке
								<strong>Логи</strong> или команда
								<code class="inline-code">journalctl -u teleposter-parser.service -e</code> на сервере.
							</p>
							<div class="parser-actions">
								<form method="POST" action="?/parserResetFailed">
									<button type="submit" class="btn btn-secondary">reset-failed (service + timer)</button>
								</form>
							</div>
						</div>

						<p class="muted small parser-log-hint">
							Журнал systemd: вкладка <button type="button" class="link-as-button" onclick={() => setTab('logs')}
								>Логи</button
							>
							— обновление одной кнопкой и копирование в буфер.
						</p>
					{:else}
						<div class="card parser-section muted">
							<p>
								В этом окружении команды <code class="inline-code">systemctl</code> не вернули данных — типично для
								локального <code class="inline-code">npm run dev</code>. На VPS с systemd вкладка покажет статус и
								журнал.
							</p>
						</div>
					{/if}
				</div>
			{/if}

			{#if tab === 'logs'}
				<div class="tab-panel" role="tabpanel">
					<div class="card parser-section parser-log-card">
						<h2 class="parser-log-card-title">Логи парсера</h2>
						<p class="muted small">
							Только <strong>недавние</strong> записи из <code class="inline-code">journalctl</code>: сервис
							<code class="inline-code">teleposter-parser.service</code> за последние ~6 часов (до 400 строк), таймер
							<code class="inline-code">teleposter-parser.timer</code> за ~24 часа. Внутри блока <strong>новые строки сверху</strong>.
							Полный архив на сервере: <code class="inline-code">journalctl -u teleposter-parser.service -e</code>.
						</p>
						<div class="parser-log-toolbar">
							<button
								type="button"
								class="btn btn-primary btn-sm"
								onclick={refreshParserLog}
								disabled={logRefreshing}
							>
								{logRefreshing ? 'Загрузка…' : 'Обновить лог'}
							</button>
							<button type="button" class="btn btn-secondary btn-sm" onclick={copyParserLog}>Скопировать в буфер</button>
							{#if logFeedback}
								<span class="parser-log-feedback" role="status">{logFeedback}</span>
							{/if}
						</div>
						<pre class="parser-log parser-log--large" aria-label="Журнал парсера">{parserLogText ||
							'Пока пусто — нажми «Обновить лог». На локальном dev без journalctl сюда попадёт пояснение из API.'}</pre>
					</div>
				</div>
			{/if}

			{#if tab === 'groups'}
				<div class="tab-panel" role="tabpanel">
					<form method="POST" action="?/create" class="card admin-form">
						<h2>Новая группа</h2>
						<label class="field full">
							<span>Ссылка на группу</span>
							<input
								name="groupLink"
								type="text"
								placeholder="t.me/BatumiTradeHub, @TbilisiTradeHub …"
								required
							/>
						</label>
						<label class="field">
							<span>Город</span>
							<select name="cityId" required>
								<option value="">Выберите город</option>
								{#each data.cities as city}
									<option value={city.id}>{city.name}</option>
								{/each}
							</select>
						</label>
						<button type="submit" class="btn btn-primary">Добавить группу</button>
					</form>

					<div class="card groups">
						<h2>Текущие группы</h2>
						<p class="muted cursor-hint">
							<strong>Курсор (last_message_id)</strong> — последний обработанный номер сообщения в Telegram. От него при
							очередном синке парсер идёт <strong>только вверх</strong> (к более новым id). Историю «вниз» так не
							подтянуть: для первичной загрузки см. справку про <strong>start_message_id</strong> и первый запуск.
						</p>
						<p class="muted cursor-hint">
							<strong>Старт (start_message_id)</strong> — заданный вручную ориентир; при сбросе курсора через форму ниже
							оба поля выставляются в выбранный id.
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
											<span class="group-active-pill" class:off={!group.isActive}>
												{group.isActive ? 'В парсере' : 'Отключена'}
											</span>
										</div>
										<div class="group-cursor-block">
											<span class="cursor-label" title="Курсор синхронизации">
												Курсор: <strong>{group.lastMessageId}</strong>
											</span>
											<span class="cursor-label" title="Стартовый id (ручной / первый прогон)">
												Старт: <strong>{group.startMessageId}</strong>
											</span>
											{#if group.lastParsedAt}
												<span class="cursor-label">
													Парсинг: <strong>{new Date(group.lastParsedAt).toLocaleString('ru-RU')}</strong>
												</span>
											{/if}
											<form method="POST" action="?/setGroupCursor" class="cursor-form">
												<input type="hidden" name="groupId" value={group.id} />
												<label class="cursor-field">
													<span class="sr-only">ID сообщения</span>
													<input
														type="number"
														name="messageId"
														min="1"
														step="1"
														placeholder="Новый id"
														class="cursor-input"
														required
													/>
												</label>
												<button type="submit" class="btn btn-secondary btn-sm">Задать курсор</button>
											</form>
										</div>
										<div class="group-toolbar">
											<form method="POST" action="?/setGroupActive">
												<input type="hidden" name="groupId" value={group.id} />
												<input type="hidden" name="isActive" value={group.isActive ? '0' : '1'} />
												<button type="submit" class="btn btn-secondary btn-sm">
													{group.isActive ? 'Отключить парсинг' : 'Включить парсинг'}
												</button>
											</form>
											<form method="POST" action="?/delete" class="group-delete-form">
												<input type="hidden" name="groupId" value={group.id} />
												<button class="btn-delete" type="submit">Удалить группу</button>
											</form>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}

			{#if tab === 'stats'}
				<div class="tab-panel" role="tabpanel">
					<div class="card groups">
						<h2>По городам</h2>
						<div class="analytics-grid">
							{#each data.cityAnalytics as row}
								<div class="analytics-card">
									<h3>{row.cityName}</h3>
									<p>Групп: <strong>{row.groups}</strong> (активных в парсере: <strong>{row.activeGroups}</strong>)</p>
									<p>Объявлений: <strong>{row.totalListings}</strong></p>
									<p>Активных: <strong>{row.activeListings}</strong></p>
									<p>Отфильтровано: <strong>{row.filteredListings}</strong></p>
									<p>За 24 ч: <strong>{row.new24h}</strong></p>
								</div>
							{/each}
						</div>
					</div>

					<div class="card groups">
						<h2>Топ групп по активным объявлениям</h2>
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
				</div>
			{/if}

			{#if tab === 'reports'}
				<div class="tab-panel" role="tabpanel">
					<div class="card groups">
						<h2>Открытые жалобы</h2>
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
				</div>
			{/if}

			{#if tab === 'ai'}
				<div class="tab-panel" role="tabpanel">
					<div class="card parser-summary">
						<div class="parser-quick-head">
							<h2>Ollama — AI-классификатор</h2>
							{#if ollamaFetchState === 'loading' && ollamaStats === null}
								<span class="parser-badge">Загрузка…</span>
							{:else if ollamaStats}
								<span class="parser-badge" class:ok={ollamaStats.ollama.online}>
									{ollamaStats.ollama.online ? 'Online' : 'Offline'}
								</span>
							{/if}
						</div>

						{#if ollamaFetchState === 'loading' && ollamaStats === null}
							<p class="muted small">Запрашиваем данные…</p>
						{:else if ollamaFetchState === 'error' && ollamaStats === null}
							<p class="muted small">Не удалось получить данные. Проверьте что Ollama запущена на сервере.</p>
						{:else if ollamaStats}
							<dl class="parser-dl">
								<div>
									<dt>Статус сервиса</dt>
									<dd><strong>{ollamaStats.ollama.online ? 'Запущен' : 'Не доступен'}</strong></dd>
								</div>
								<div>
									<dt>Установленные модели</dt>
									<dd>
										{#if ollamaStats.ollama.models.length === 0}
											<span class="muted">Нет моделей</span>
										{:else}
											{#each ollamaStats.ollama.models as model}
												<div>
													<strong>{model.name}</strong>
													<span class="muted small"> — {formatBytes(model.size)}</span>
												</div>
											{/each}
										{/if}
									</dd>
								</div>
								<div>
									<dt>Загружена в память</dt>
									<dd>
										{#if ollamaStats.ollama.running.length === 0}
											<span class="muted">Не загружена (загружается при первом запросе)</span>
										{:else}
											{#each ollamaStats.ollama.running as m}
												<strong>{m.name}</strong>
												{#if m.sizeVram > 0}
													<span class="muted small"> — VRAM: {formatBytes(m.sizeVram)}</span>
												{/if}
											{/each}
										{/if}
									</dd>
								</div>
								<div>
									<dt>Данные обновлены</dt>
									<dd class="muted small">{new Date(ollamaStats.at).toLocaleTimeString('ru-RU')} · опрос каждые 15 с</dd>
								</div>
							</dl>
						{/if}
					</div>

					{#if ollamaStats}
						<div class="card groups">
							<h2>Распределение объявлений по категориям</h2>
							<p class="muted small">
								Только активные объявления. Показывает насколько хорошо AI классифицирует поток.
							</p>
							{#if ollamaStats.total === 0}
								<p class="muted">Нет активных объявлений.</p>
							{:else}
								<ul class="analytics-list">
									{#each ollamaStats.categoryStats as row}
										{@const pct = Math.round((row.count / ollamaStats.total) * 100)}
										<li class="ai-cat-row">
											<span class="ai-cat-name"><strong>{row.name}</strong></span>
											<span class="ai-cat-bar-wrap">
												<span class="ai-cat-bar" style="width: {pct}%"></span>
											</span>
											<span class="ai-cat-count">{row.count}</span>
											<span class="muted small ai-cat-pct">{pct}%</span>
										</li>
									{/each}
									{#if ollamaStats.uncategorized > 0}
										{@const pct = Math.round((ollamaStats.uncategorized / ollamaStats.total) * 100)}
										<li class="ai-cat-row ai-cat-row--none">
											<span class="ai-cat-name"><strong>Без категории</strong></span>
											<span class="ai-cat-bar-wrap">
												<span class="ai-cat-bar ai-cat-bar--none" style="width: {pct}%"></span>
											</span>
											<span class="ai-cat-count">{ollamaStats.uncategorized}</span>
											<span class="muted small ai-cat-pct">{pct}%</span>
										</li>
									{/if}
								</ul>
								<p class="muted small" style="margin-top: 0.5rem">
									Всего активных: <strong>{ollamaStats.total}</strong>
								</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if tab === 'docs'}
				<div class="tab-panel" role="tabpanel">
					<article class="card docs-article">
						<h2>Как устроен парсер</h2>
						<p>
							Скрипт синхронизации (<code class="inline-code">npm run parser:sync</code>) читает из БД все группы с
							<code class="inline-code">is_active = true</code>, для каждой тянет публичные страницы t.me (embed) и
							создаёт/обновляет объявления. На сервере это обычно крутит systemd: таймер
							<code class="inline-code">teleposter-parser.timer</code> периодически запускает oneshot-сервис
							<code class="inline-code">teleposter-parser.service</code> с блокировкой, чтобы не было двух прогонов
							одновременно.
						</p>
						<p>
							Во вкладке <strong>Парсер</strong> можно вручную запустить прогон, <strong>остановить</strong> текущий
							(<code class="inline-code">systemctl stop teleposter-parser.service</code>) или
							<strong>перезапустить</strong> юнит — без отключения таймера; отдельно управляются старт/стоп и enable/disable
							самого таймера.
						</p>

						<h3>Первый запуск по новой группе</h3>
						<ul class="docs-list">
							<li>
								Если <strong>курсор</strong> ещё «пустой» (<code class="inline-code">last_message_id ≤ 1</code>) и
								<strong>start_message_id = 0</strong>: парсер сам находит верхний id в канале и качает историю
								<strong>вниз</strong> (к старым сообщениям), затем выставляет курсор.
							</li>
							<li>
								Если вы задали <strong>start_message_id &gt; 0</strong> при таком же пустом курсоре: парсер идёт
								<strong>только вверх</strong> от этого номера (удобно, если не нужна вся история).
							</li>
							<li>
								После того как группа уже синхронизировалась, используется только движение <strong>вверх</strong> от
								<code class="inline-code">last_message_id</code>.
							</li>
						</ul>

						<h3>Поле «Задать курсор» в списке групп</h3>
						<p>
							Устанавливает и <code class="inline-code">start_message_id</code>, и
							<code class="inline-code">last_message_id</code> в указанное значение. Дальше в эту группу попадут только
							сообщения с большим id в Telegram. Используйте номер из ссылки вида
							<code class="inline-code">t.me/name/<strong>12345</strong></code>.
						</p>

						<h3>Кнопка «Отключить парсинг»</h3>
						<p>
							Группа остаётся в базе, но исключается из цикла <code class="inline-code">parser:sync</code>. Объявления на
							сайте не удаляются автоматически.
						</p>

						<h3>Лимиты и сбои</h3>
						<ul class="docs-list">
							<li>
								В unit-файле парсера задано <code class="inline-code">TimeoutStartSec=14400</code> (4 ч): несколько
								групп с долгим проходом «вверх» и рефреш фото иначе упираются в лимит и systemd шлёт SIGTERM.
							</li>
							<li>
								Если предыдущий синк ещё выполняется, новый старт через таймер обычно тихо пропускается (flock).
							</li>
							<li>
								Дополнительные скрипты (ручной запуск на сервере):
								<code class="inline-code">parser:refresh-images</code>,
								<code class="inline-code">parser:cleanup-duplicates</code> (три прохода по БД, в т.ч. дубли по
								город+цена+первое фото) и др. — см. <code class="inline-code">package.json</code>. На VPS после
								деплоя таймер <code class="inline-code">teleposter-dedupe.timer</code> запускает дедуп с
								<code class="inline-code">APPLY=1</code> раз в 12 ч.
							</li>
						</ul>

						<h3>Переменные окружения (фрагмент)</h3>
						<p class="muted">
							Полный список — в <code class="inline-code">.env.example</code>. Кратко:
							<code class="inline-code">DATABASE_URL</code> обязателен на проде; прокси для запросов к t.me —
							<code class="inline-code">PARSER_HTTPS_PROXY</code> / <code class="inline-code">HTTPS_PROXY</code>;
							скорость синка — <code class="inline-code">SYNC_MESSAGE_GAP_MS</code>,
							<code class="inline-code">SYNC_CURSOR_FLUSH_EVERY</code>; рефреш фото —
							<code class="inline-code">REFRESH_*</code>.
						</p>
					</article>
				</div>
			{/if}
		{/if}
	</div>
</section>
