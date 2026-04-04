import { error, json } from '@sveltejs/kit';
import { getParserJournalBundle } from '$lib/server/parser-journal';
import type { RequestHandler } from './$types';

const ADMIN_COOKIE = 'teleposter_admin_session';
const ADMIN_COOKIE_VALUE = 'ok';

export const GET: RequestHandler = async ({ cookies }) => {
	if (cookies.get(ADMIN_COOKIE) !== ADMIN_COOKIE_VALUE) {
		error(401, 'Unauthorized');
	}

	const log = await getParserJournalBundle();
	return json(
		{
			log:
				log ||
				'journalctl не вернул данные (нет systemd, нет прав или юниты teleposter-parser.* не найдены). На VPS проверьте, что парсер ставится через deploy и unit-файлы установлены.'
		},
		{
			headers: {
				'Cache-Control': 'no-store, no-cache, must-revalidate',
				Pragma: 'no-cache'
			}
		}
	);
};
