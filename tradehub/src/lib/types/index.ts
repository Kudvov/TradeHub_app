import type { cities, categories, listings, telegramGroups } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type City = InferSelectModel<typeof cities>;
export type Category = InferSelectModel<typeof categories>;
export type Listing = InferSelectModel<typeof listings>;
export type TelegramGroup = InferSelectModel<typeof telegramGroups>;

export type ListingWithRelations = Listing & {
	city?: City;
	category?: Category;
	telegramGroup?: TelegramGroup;
};

export type ListingsFilter = {
	citySlug?: string;
	categorySlug?: string;
	query?: string;
	page?: number;
	limit?: number;
};

export type PaginatedResponse<T> = {
	data: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};
