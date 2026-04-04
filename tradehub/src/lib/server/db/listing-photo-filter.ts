import { sql } from 'drizzle-orm';
import { listings } from './schema';

/** Публичная лента: только объявления с хотя бы одним URL в `images` (jsonb-массив). */
export const listingHasPhotosSql = sql`(coalesce(jsonb_array_length(coalesce(${listings.images}, '[]'::jsonb)), 0) > 0)`;
