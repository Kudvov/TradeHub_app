import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { listings } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const ADMIN_COOKIE = 'teleposter_admin_session';
const ADMIN_COOKIE_VALUE = 'ok';

async function execSystemctlLine(cmd: string): Promise<string> {
	try {
		const { stdout } = await execAsync(cmd, { maxBuffer: 64 * 1024 });
		return stdout.trim();
	} catch (e: unknown) {
		const err = e as { stdout?: string };
		if (typeof err.stdout === 'string' && err.stdout.trim()) return err.stdout.trim();
		return '';
	}
}

export const GET: RequestHandler = async ({ cookies }) => {
	if (cookies.get(ADMIN_COOKIE) !== ADMIN_COOKIE_VALUE) {
		error(401, 'Unauthorized');
	}

	const [r5, r15, r60, serviceRaw] = await Promise.all([
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(listings)
			.where(sql`${listings.createdAt} >= now() - interval '5 minutes'`),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(listings)
			.where(sql`${listings.createdAt} >= now() - interval '15 minutes'`),
		db
			.select({ n: sql<number>`count(*)::int` })
			.from(listings)
			.where(sql`${listings.createdAt} >= now() - interval '60 minutes'`),
		execSystemctlLine('systemctl is-active teleposter-parser.service')
	]);

	const new5m = Number(r5[0]?.n ?? 0);
	const new15m = Number(r15[0]?.n ?? 0);
	const new60m = Number(r60[0]?.n ?? 0);

	const serviceActive = serviceRaw || 'n/a';
	const parserRunning = ['activating', 'active', 'start'].includes(serviceActive);

	return json({
		ok: true,
		new5m,
		new15m,
		new60m,
		parserService: serviceActive,
		parserRunning,
		at: new Date().toISOString()
	});
};
