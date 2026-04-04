import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/** Не тащить в админку весь архив journal — только недавнее окно (см. `man journalctl` --since). */
const SERVICE_SINCE = '6 hours ago';
const SERVICE_MAX_LINES = 400;
const TIMER_SINCE = '24 hours ago';
const TIMER_MAX_LINES = 80;

async function journalUnit(unit: string, since: string, maxLines: number): Promise<string> {
	try {
		// --since: только актуальный период; -r: новые записи сверху
		const sinceSafe = since.replace(/'/g, "'\\''");
		const { stdout } = await execAsync(
			`journalctl -u ${unit} --since '${sinceSafe}' -n ${maxLines} -r --no-pager -o short-iso 2>/dev/null`,
			{ maxBuffer: 2 * 1024 * 1024 }
		);
		return stdout.trim();
	} catch (e: unknown) {
		const err = e as { stdout?: string };
		if (typeof err.stdout === 'string' && err.stdout.trim()) return err.stdout.trim();
		return '';
	}
}

/**
 * Текст для админки / API: сервис парсера + короткий хвост таймера.
 * Пустая строка — journalctl недоступен или нет вывода.
 */
export async function getParserJournalBundle(): Promise<string> {
	const [service, timer] = await Promise.all([
		journalUnit('teleposter-parser.service', SERVICE_SINCE, SERVICE_MAX_LINES),
		journalUnit('teleposter-parser.timer', TIMER_SINCE, TIMER_MAX_LINES)
	]);

	if (!service && !timer) {
		return '';
	}

	return [
		`=== teleposter-parser.service (с ${SERVICE_SINCE}, не более ${SERVICE_MAX_LINES} строк, новые сверху) ===`,
		service || '(за этот период записей нет)',
		'',
		`=== teleposter-parser.timer (с ${TIMER_SINCE}, не более ${TIMER_MAX_LINES} строк, новые сверху) ===`,
		timer || '(за этот период записей нет)',
		'',
		`--- снято ${new Date().toISOString()} ---`
	].join('\n');
}
