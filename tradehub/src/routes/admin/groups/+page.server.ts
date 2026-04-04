import { fail } from '@sveltejs/kit';
import { getParserJournalBundle } from '$lib/server/parser-journal';
import { db } from '$lib/server/db';
import { bannedAuthors, cities, listingReports, listings, telegramGroups } from '$lib/server/db/schema';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_KEY ?? '';
const ADMIN_COOKIE = 'teleposter_admin_session';
const ADMIN_COOKIE_VALUE = 'ok';

function normalizeUsername(value: string): string {
	return value.trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
}

function ensureAuth(cookies: { get: (name: string) => string | undefined }) {
	return cookies.get(ADMIN_COOKIE) === ADMIN_COOKIE_VALUE;
}

/** SvelteKit cannot serialize BigInt in page data; Drizzle returns bigint for some columns. */
function stripBigInts<T>(value: T): T {
	if (value === null || value === undefined) return value;
	if (typeof value === 'bigint') return String(value) as T;
	if (Array.isArray(value)) return value.map(stripBigInts) as T;
	if (typeof value === 'object') {
		if (value instanceof Date) return value as T;
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = stripBigInts(v);
		}
		return out as T;
	}
	return value;
}

/** systemctl часто возвращает код ≠0 для inactive/disabled; exec() тогда бросает — читаем stdout из ошибки. */
async function execSystemctlLine(cmd: string): Promise<string> {
	try {
		const { stdout } = await execAsync(cmd, { maxBuffer: 256 * 1024 });
		return stdout.trim();
	} catch (e: unknown) {
		const err = e as { stdout?: string };
		if (typeof err.stdout === 'string' && err.stdout.trim()) return err.stdout.trim();
		return '';
	}
}

async function getParserState() {
	try {
		const [timerActive, timerEnabled, serviceActive, nextRunRaw] = await Promise.all([
			execSystemctlLine('systemctl is-active teleposter-parser.timer'),
			execSystemctlLine('systemctl is-enabled teleposter-parser.timer'),
			execSystemctlLine('systemctl is-active teleposter-parser.service'),
			execSystemctlLine(
				"systemctl list-timers --all --no-legend teleposter-parser.timer 2>/dev/null | awk '{print $1\" \"$2\" \"$3}'"
			)
		]);

		const hasSystemctl =
			timerActive !== '' || timerEnabled !== '' || serviceActive !== '' || nextRunRaw !== '';

		return {
			available: hasSystemctl,
			timerActive: timerActive || 'n/a',
			timerEnabled: timerEnabled || 'n/a',
			serviceActive: serviceActive || 'n/a',
			nextRun: nextRunRaw || 'n/a'
		};
	} catch {
		return {
			available: false,
			timerActive: 'n/a',
			timerEnabled: 'n/a',
			serviceActive: 'n/a',
			nextRun: 'n/a'
		};
	}
}

export const load: PageServerLoad = async ({ cookies }) => {
	const authenticated = ensureAuth(cookies);
	if (!authenticated) {
		return {
			authenticated,
			cities: [],
			groups: [],
			parser: await getParserState(),
			parserLog: '',
			cityAnalytics: [],
			groupAnalytics: [],
			reports: []
		};
	}

	const [allCities, groups, parser] = await Promise.all([
		db.select().from(cities).orderBy(asc(cities.name)),
		db.query.telegramGroups.findMany({
			orderBy: [desc(telegramGroups.createdAt)],
			with: { city: true }
		}),
		getParserState()
	]);
	const parserLog = parser.available ? await getParserJournalBundle() : '';

	const groupRows = await db
		.select({
			groupId: listings.telegramGroupId,
			total: sql<number>`count(*)::int`,
			active: sql<number>`count(*) filter (where ${listings.status} = 'active')::int`,
			filtered: sql<number>`count(*) filter (where ${listings.status} = 'filtered')::int`,
			new24h: sql<number>`count(*) filter (where ${listings.publishedAt} >= now() - interval '24 hours')::int`
		})
		.from(listings)
		.where(sql`${listings.telegramGroupId} is not null`)
		.groupBy(listings.telegramGroupId);

	const byGroupId = new Map<number, { total: number; active: number; filtered: number; new24h: number }>();
	for (const row of groupRows) {
		if (!row.groupId) continue;
		byGroupId.set(row.groupId, {
			total: Number(row.total ?? 0),
			active: Number(row.active ?? 0),
			filtered: Number(row.filtered ?? 0),
			new24h: Number(row.new24h ?? 0)
		});
	}

	const cityAnalytics = allCities.map((city) => {
		const cityGroups = groups.filter((g) => g.cityId === city.id);
		const activeGroups = cityGroups.filter((g) => g.isActive).length;
		let totalListings = 0;
		let activeListings = 0;
		let filteredListings = 0;
		let new24h = 0;

		for (const group of cityGroups) {
			const stat = byGroupId.get(group.id);
			if (!stat) continue;
			totalListings += stat.total;
			activeListings += stat.active;
			filteredListings += stat.filtered;
			new24h += stat.new24h;
		}

		return {
			cityId: city.id,
			cityName: city.name,
			groups: cityGroups.length,
			activeGroups,
			totalListings,
			activeListings,
			filteredListings,
			new24h
		};
	});

	const groupAnalytics = groups
		.map((group) => {
			const stat = byGroupId.get(group.id) ?? { total: 0, active: 0, filtered: 0, new24h: 0 };
			return {
				id: group.id,
				title: group.title,
				username: group.username,
				cityName: group.city?.name ?? '—',
				isActive: group.isActive,
				totalListings: stat.total,
				activeListings: stat.active,
				filteredListings: stat.filtered,
				new24h: stat.new24h,
				lastParsedAt: group.lastParsedAt
			};
		})
		.sort((a, b) => b.activeListings - a.activeListings)
		.slice(0, 20);

	type ReportRow = Awaited<
		ReturnType<
			typeof db.query.listingReports.findMany<{
				with: {
					listing: { with: { city: true; telegramGroup: true } };
				};
			}>
		>
	>[number];

	let reports: ReportRow[] = [];
	try {
		reports = await db.query.listingReports.findMany({
			where: eq(listingReports.status, 'open'),
			orderBy: [desc(listingReports.createdAt)],
			with: {
				listing: {
					with: { city: true, telegramGroup: true }
				}
			},
			limit: 100
		});
	} catch (e) {
		console.error('[admin/groups] listing_reports query failed', e);
	}

	return {
		authenticated,
		cities: allCities,
		groups: stripBigInts(groups),
		parser,
		parserLog,
		cityAnalytics,
		groupAnalytics,
		reports: stripBigInts(reports)
	};
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const login = String(formData.get('login') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
			return fail(401, { error: 'Неверный логин или пароль.' });
		}

		cookies.set(ADMIN_COOKIE, ADMIN_COOKIE_VALUE, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			maxAge: 60 * 60 * 24 * 30
		});
		return { success: true, message: 'Вход выполнен.' };
	},

	logout: async ({ cookies }) => {
		cookies.delete(ADMIN_COOKIE, { path: '/' });
		return { success: true, message: 'Вы вышли из админки.' };
	},

	create: async ({ request, cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		const formData = await request.formData();
		const usernameRaw = String(formData.get('groupLink') ?? '').trim();
		const cityId = Number(formData.get('cityId'));

		if (!Number.isInteger(cityId) || cityId <= 0) {
			return fail(400, { error: 'Выберите город.' });
		}

		const city = await db.query.cities.findFirst({ where: eq(cities.id, cityId) });
		if (!city) {
			return fail(400, { error: 'Город не найден.' });
		}

		const username = normalizeUsername(usernameRaw);
		if (!/^[a-zA-Z0-9_]{5,}$/.test(username)) {
			return fail(400, { error: 'Ссылка должна быть в формате t.me/name или @name.' });
		}

		const exists = await db.query.telegramGroups.findFirst({
			where: eq(telegramGroups.username, username)
		});

		if (exists) {
			return fail(400, { error: `Группа @${username} уже добавлена.` });
		}

		await db.insert(telegramGroups).values({
			title: `@${username}`,
			username,
			cityId,
			isActive: true,
			startMessageId: 0,
			lastMessageId: 1
		});

		return {
			success: true,
			message: `Группа @${username} добавлена для города ${city.name}.`
		};
	},

	delete: async ({ request, cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		const formData = await request.formData();
		const groupId = Number(formData.get('groupId'));
		if (!Number.isInteger(groupId) || groupId <= 0) {
			return fail(400, { error: 'Некорректный ID группы.' });
		}

		const group = await db.query.telegramGroups.findFirst({
			where: eq(telegramGroups.id, groupId)
		});
		if (!group) {
			return fail(404, { error: 'Группа не найдена.' });
		}

		await db.delete(telegramGroups).where(eq(telegramGroups.id, groupId));
		return {
			success: true,
			message: `Группа @${group.username ?? group.id} удалена.`
		};
	},

	/** Курсор Telegram: от этого номера сообщения парсер идёт только вперёд (рост ID), не назад */
	setGroupCursor: async ({ request, cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		const formData = await request.formData();
		const groupId = Number(formData.get('groupId'));
		const messageId = Number(formData.get('messageId'));
		if (!Number.isInteger(groupId) || groupId <= 0) {
			return fail(400, { error: 'Некорректный ID группы.' });
		}
		if (!Number.isInteger(messageId) || messageId < 1) {
			return fail(400, { error: 'Укажите номер сообщения в Telegram (целое число ≥ 1).' });
		}

		const group = await db.query.telegramGroups.findFirst({
			where: eq(telegramGroups.id, groupId)
		});
		if (!group) {
			return fail(404, { error: 'Группа не найдена.' });
		}

		await db
			.update(telegramGroups)
			.set({
				startMessageId: messageId,
				lastMessageId: messageId
			})
			.where(eq(telegramGroups.id, groupId));

		return {
			success: true,
			message: `Для @${group.username ?? group.id} установлен курсор на сообщение ${messageId}. Дальше парсер берёт только более новые посты.`
		};
	},

	parserRunNow: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl start teleposter-parser.service');
			return { success: true, message: 'Парсер запущен вручную.' };
		} catch {
			return fail(500, { error: 'Не удалось запустить парсер.' });
		}
	},

	/** Остановить текущий прогон parser:sync (SIGTERM процессу внутри юнита). Таймер не трогаем. */
	parserStopService: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl stop teleposter-parser.service', { maxBuffer: 256 * 1024 });
			return {
				success: true,
				message: 'Прогон парсера остановлен (если он выполнялся). Таймер по расписанию не отключён.'
			};
		} catch (e: unknown) {
			const err = e as { stderr?: string };
			return fail(500, { error: err.stderr?.trim() || 'Не удалось остановить парсер.' });
		}
	},

	/** Остановить юнит и сразу запустить новый прогон (удобно после зависания или для полного перезапуска). */
	parserRestartService: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl restart teleposter-parser.service', { maxBuffer: 256 * 1024 });
			return {
				success: true,
				message: 'Парсер перезапущен: текущий прогон остановлен и запущен новый.'
			};
		} catch (e: unknown) {
			const err = e as { stderr?: string };
			return fail(500, { error: err.stderr?.trim() || 'Не удалось перезапустить парсер.' });
		}
	},

	parserStartTimer: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl start teleposter-parser.timer');
			return { success: true, message: 'Таймер парсера запущен.' };
		} catch {
			return fail(500, { error: 'Не удалось запустить таймер.' });
		}
	},

	parserStopTimer: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl stop teleposter-parser.timer');
			return { success: true, message: 'Таймер парсера остановлен.' };
		} catch {
			return fail(500, { error: 'Не удалось остановить таймер.' });
		}
	},

	parserEnableTimer: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl enable teleposter-parser.timer');
			return { success: true, message: 'Автозапуск таймера включен.' };
		} catch {
			return fail(500, { error: 'Не удалось включить автозапуск.' });
		}
	},

	parserDisableTimer: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl disable teleposter-parser.timer');
			return { success: true, message: 'Автозапуск таймера отключен.' };
		} catch {
			return fail(500, { error: 'Не удалось отключить автозапуск.' });
		}
	},

	parserResetFailed: async ({ cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		try {
			await execAsync('systemctl reset-failed teleposter-parser.service teleposter-parser.timer');
			return { success: true, message: 'Состояние failed сброшено для юнитов парсера.' };
		} catch {
			return fail(500, { error: 'Не удалось выполнить reset-failed.' });
		}
	},

	setGroupActive: async ({ request, cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		const formData = await request.formData();
		const groupId = Number(formData.get('groupId'));
		const raw = String(formData.get('isActive') ?? '');
		if (!Number.isInteger(groupId) || groupId <= 0) {
			return fail(400, { error: 'Некорректный ID группы.' });
		}
		const isActive = raw === '1' || raw === 'true';
		const group = await db.query.telegramGroups.findFirst({
			where: eq(telegramGroups.id, groupId)
		});
		if (!group) return fail(404, { error: 'Группа не найдена.' });
		await db.update(telegramGroups).set({ isActive }).where(eq(telegramGroups.id, groupId));
		return {
			success: true,
			message: isActive
				? `Группа @${group.username ?? group.id} снова участвует в синхронизации.`
				: `Группа @${group.username ?? group.id} отключена от парсинга.`
		};
	},

	reportDismiss: async ({ request, cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		const formData = await request.formData();
		const reportId = Number(formData.get('reportId'));
		if (!Number.isInteger(reportId) || reportId <= 0) return fail(400, { error: 'Некорректная жалоба.' });
		await db.update(listingReports).set({ status: 'dismissed' }).where(eq(listingReports.id, reportId));
		return { success: true, message: 'Жалоба отклонена.' };
	},

	reportDeleteListing: async ({ request, cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		const formData = await request.formData();
		const reportId = Number(formData.get('reportId'));
		const listingId = Number(formData.get('listingId'));
		if (!Number.isInteger(reportId) || !Number.isInteger(listingId) || reportId <= 0 || listingId <= 0) {
			return fail(400, { error: 'Некорректные данные.' });
		}
		await db.update(listings).set({ status: 'filtered' }).where(eq(listings.id, listingId));
		await db.update(listingReports).set({ status: 'resolved' }).where(eq(listingReports.id, reportId));
		return { success: true, message: 'Объявление скрыто, жалоба закрыта.' };
	},

	reportBanAuthor: async ({ request, cookies }) => {
		if (!ensureAuth(cookies)) return fail(401, { error: 'Требуется авторизация.' });
		const formData = await request.formData();
		const reportId = Number(formData.get('reportId'));
		const listingId = Number(formData.get('listingId'));
		if (!Number.isInteger(reportId) || !Number.isInteger(listingId) || reportId <= 0 || listingId <= 0) {
			return fail(400, { error: 'Некорректные данные.' });
		}

		const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
		if (!listing?.contact) return fail(400, { error: 'У автора нет контакта для бана.' });

		await db.insert(bannedAuthors).values({ contact: listing.contact, reason: 'manual_report_ban' }).onConflictDoNothing();
		const rows = await db
			.select({ id: listings.id })
			.from(listings)
			.where(eq(listings.contact, listing.contact));
		if (rows.length > 0) {
			await db.update(listings).set({ status: 'filtered' }).where(inArray(listings.id, rows.map((r) => r.id)));
		}
		await db.update(listingReports).set({ status: 'resolved' }).where(eq(listingReports.id, reportId));
		return { success: true, message: 'Автор заблокирован, его объявления скрыты.' };
	}
};
