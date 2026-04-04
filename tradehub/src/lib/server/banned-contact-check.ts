import { eq } from 'drizzle-orm';
import { db } from './db';
import { bannedAuthors } from './db/schema';

/** null — ещё не проверяли; false — таблицы нет / недоступна; true — можно читать баны */
let bannedAuthorsTableOk: boolean | null = null;

/**
 * Проверка: контакт в таблице banned_authors.
 * Если таблицы нет в БД — один раз пишем в лог и дальше возвращаем false (как «не забанен»), без спама на каждый пост.
 */
export async function isContactBanned(contact: string | null | undefined): Promise<boolean> {
	if (!contact) return false;
	if (bannedAuthorsTableOk === false) return false;

	if (bannedAuthorsTableOk === null) {
		try {
			await db.select({ id: bannedAuthors.id }).from(bannedAuthors).limit(1);
			bannedAuthorsTableOk = true;
		} catch (e) {
			bannedAuthorsTableOk = false;
			console.error(
				'\n⚠️ Таблица banned_authors недоступна — проверка банов отключена до исправления БД и перезапуска.\n' +
					'   psql "$DATABASE_URL" -f scripts/migrations/2026-04-banned-authors-table.sql\n' +
					'   или из каталога приложения: npm run db:push\n',
				e
			);
			return false;
		}
	}

	try {
		const rows = await db
			.select({ id: bannedAuthors.id })
			.from(bannedAuthors)
			.where(eq(bannedAuthors.contact, contact))
			.limit(1);
		return rows.length > 0;
	} catch (e) {
		console.error(`banned_authors: ошибка при проверке контакта (${String(contact).slice(0, 80)})`, e);
		return false;
	}
}
