import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;

	try {
		const { db } = await import('$lib/server/db');
		const { listings, cities } = await import('$lib/server/db/schema');
		const { listingHasPhotosSql } = await import('$lib/server/db/listing-photo-filter');
		const { eq, and, desc, inArray } = await import('drizzle-orm');

		const allCities = await db
			.select({ slug: cities.slug })
			.from(cities)
			.where(inArray(cities.slug, ['batumi', 'tbilisi']));

		// Последние 1000 активных объявлений с фото
		const activeListings = await db
			.select({ id: listings.id, publishedAt: listings.publishedAt })
			.from(listings)
			.where(and(eq(listings.status, 'active'), listingHasPhotosSql))
			.orderBy(desc(listings.publishedAt))
			.limit(1000);

		const cityUrls = allCities
			.map(
				(c) => `
  <url>
    <loc>${origin}/${c.slug}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`
			)
			.join('');

		const listingUrls = activeListings
			.map((l) => {
				const lastmod = l.publishedAt
					? new Date(l.publishedAt).toISOString().split('T')[0]
					: '';
				return `
  <url>
    <loc>${origin}/listing/${l.id}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
			})
			.join('');

		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${origin}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${cityUrls}${listingUrls}
</urlset>`;

		return new Response(xml, {
			headers: {
				'Content-Type': 'application/xml',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (e) {
		console.error('[sitemap] error', e);
		return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
			headers: { 'Content-Type': 'application/xml' }
		});
	}
};
