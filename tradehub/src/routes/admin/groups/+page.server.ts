import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cities, telegramGroups } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

function normalizeUsername(value: string): string {
	return value.trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
}

async function getParserState() {
	try {
		const [timerActive, timerEnabled, serviceActive] = await Promise.all([
			execAsync('systemctl is-active tradehub-parser.timer'),
			execAsync('systemctl is-enabled tradehub-parser.timer'),
			execAsync('systemctl is-active tradehub-parser.service')
		]);
		const nextRunRaw = await execAsync(
			"systemctl list-timers --all --no-legend tradehub-parser.timer | awk '{print $1\" \"$2\" \"$3}'"
		);

		return {
			available: true,
			timerActive: timerActive.stdout.trim(),
			timerEnabled: timerEnabled.stdout.trim(),
			serviceActive: serviceActive.stdout.trim(),
			nextRun: nextRunRaw.stdout.trim() || 'n/a'
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

export const load: PageServerLoad = async () => {
	const [allCities, groups, parser] = await Promise.all([
		db.select().from(cities).orderBy(asc(cities.name)),
		db.query.telegramGroups.findMany({
			orderBy: [desc(telegramGroups.createdAt)],
			with: { city: true }
		}),
		getParserState()
	]);

	return {
		cities: allCities,
		groups,
		parser
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
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

	delete: async ({ request }) => {
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

	parserRunNow: async () => {
		try {
			await execAsync('systemctl start tradehub-parser.service');
			return { success: true, message: 'Парсер запущен вручную.' };
		} catch {
			return fail(500, { error: 'Не удалось запустить парсер.' });
		}
	},

	parserStartTimer: async () => {
		try {
			await execAsync('systemctl start tradehub-parser.timer');
			return { success: true, message: 'Таймер парсера запущен.' };
		} catch {
			return fail(500, { error: 'Не удалось запустить таймер.' });
		}
	},

	parserStopTimer: async () => {
		try {
			await execAsync('systemctl stop tradehub-parser.timer');
			return { success: true, message: 'Таймер парсера остановлен.' };
		} catch {
			return fail(500, { error: 'Не удалось остановить таймер.' });
		}
	},

	parserEnableTimer: async () => {
		try {
			await execAsync('systemctl enable tradehub-parser.timer');
			return { success: true, message: 'Автозапуск таймера включен.' };
		} catch {
			return fail(500, { error: 'Не удалось включить автозапуск.' });
		}
	},

	parserDisableTimer: async () => {
		try {
			await execAsync('systemctl disable tradehub-parser.timer');
			return { success: true, message: 'Автозапуск таймера отключен.' };
		} catch {
			return fail(500, { error: 'Не удалось отключить автозапуск.' });
		}
	}
};
