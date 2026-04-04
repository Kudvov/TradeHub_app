export const LISTING_PERIOD_SLUGS = ['today', 'yesterday', 'week', 'month'] as const;
export type ListingPeriodSlug = (typeof LISTING_PERIOD_SLUGS)[number] | '';

export function parseListingPeriod(raw: string | null | undefined): ListingPeriodSlug {
	if (!raw) return '';
	return (LISTING_PERIOD_SLUGS as readonly string[]).includes(raw) ? (raw as ListingPeriodSlug) : '';
}
