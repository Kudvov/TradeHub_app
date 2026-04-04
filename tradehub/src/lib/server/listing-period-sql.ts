import type { ListingPeriodSlug } from '$lib/listing-period';
import { sql } from 'drizzle-orm';
import { listings } from './db/schema';

function periodTimeZone(): string {
	const e = process.env.LISTINGS_PERIOD_TIMEZONE?.trim();
	if (e && /^[A-Za-z_]+\/[A-Za-z_]+$/.test(e)) return e;
	return 'Asia/Tbilisi';
}

const TZ = periodTimeZone();
const tzLit = sql.raw(`'${TZ.replace(/'/g, "''")}'`);

type NonEmptyPeriod = Exclude<ListingPeriodSlug, ''>;

/**
 * Дата поста в Telegram (`published_at`) в периоде (календарь в TZ, по умолчанию Asia/Tbilisi).
 * week — 7 дней включая сегодня, month — 30 дней включая сегодня.
 */
export function listingPublishedInPeriodSql(period: NonEmptyPeriod) {
	const col = listings.publishedAt;
	switch (period) {
		case 'today':
			return sql`((${col} AT TIME ZONE ${tzLit})::date = (CURRENT_TIMESTAMP AT TIME ZONE ${tzLit})::date)`;
		case 'yesterday':
			return sql`((${col} AT TIME ZONE ${tzLit})::date = (CURRENT_TIMESTAMP AT TIME ZONE ${tzLit})::date - 1)`;
		case 'week':
			return sql`((${col} AT TIME ZONE ${tzLit})::date >= (CURRENT_TIMESTAMP AT TIME ZONE ${tzLit})::date - 6)`;
		case 'month':
			return sql`((${col} AT TIME ZONE ${tzLit})::date >= (CURRENT_TIMESTAMP AT TIME ZONE ${tzLit})::date - 29)`;
		default:
			return sql`true`;
	}
}
