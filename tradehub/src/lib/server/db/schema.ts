import {
	pgTable,
	serial,
	text,
	integer,
	boolean,
	timestamp,
	decimal,
	jsonb,
	bigint,
	index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Cities ───────────────────────────────────────────
export const cities = pgTable(
	'cities',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		country: text('country').notNull().default('GE'),
		imageUrl: text('image_url'),
		listingsCount: integer('listings_count').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('cities_slug_idx').on(table.slug)]
);

export const citiesRelations = relations(cities, ({ many }) => ({
	telegramGroups: many(telegramGroups),
	listings: many(listings)
}));

// ─── Telegram Groups ─────────────────────────────────
export const telegramGroups = pgTable(
	'telegram_groups',
	{
		id: serial('id').primaryKey(),
		telegramId: bigint('telegram_id', { mode: 'bigint' }),
		title: text('title').notNull(),
		username: text('username'),
		cityId: integer('city_id')
			.notNull()
			.references(() => cities.id),
		isActive: boolean('is_active').notNull().default(true),
		lastMessageId: integer('last_message_id').notNull().default(1),
		// Начальный ID для первого парсинга истории вниз (0 = автоопределение)
		startMessageId: integer('start_message_id').notNull().default(0),
		lastParsedAt: timestamp('last_parsed_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('tg_groups_city_idx').on(table.cityId)]
);

export const telegramGroupsRelations = relations(telegramGroups, ({ one, many }) => ({
	city: one(cities, {
		fields: [telegramGroups.cityId],
		references: [cities.id]
	}),
	listings: many(listings)
}));

// ─── Categories ───────────────────────────────────────
export const categories = pgTable('categories', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	icon: text('icon').notNull().default('📦'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const categoriesRelations = relations(categories, ({ many }) => ({
	listings: many(listings)
}));

// ─── Listings (Объявления) ────────────────────────────
export const listings = pgTable(
	'listings',
	{
		id: serial('id').primaryKey(),
		telegramMessageId: bigint('telegram_message_id', { mode: 'bigint' }),
		telegramGroupId: integer('telegram_group_id').references(() => telegramGroups.id),
		cityId: integer('city_id')
			.notNull()
			.references(() => cities.id),
		categoryId: integer('category_id').references(() => categories.id),
		title: text('title').notNull(),
		description: text('description'),
		price: decimal('price', { precision: 12, scale: 2 }),
		currency: text('currency').notNull().default('GEL'),
		contact: text('contact'),
		/** SHA-256 hex нормализованного title+description для поиска дублей внутри группы */
		contentHash: text('content_hash'),
		images: jsonb('images').$type<string[]>().default([]),
		status: text('status').notNull().default('active'),
		titleEn: text('title_en'),
		descriptionEn: text('description_en'),
		titleKa: text('title_ka'),
		descriptionKa: text('description_ka'),
		publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		/** Когда последний раз проверяли актуальность объявления на t.me */
		checkedAt: timestamp('checked_at', { withTimezone: true })
	},
	(table) => [
		index('listings_city_idx').on(table.cityId),
		index('listings_category_idx').on(table.categoryId),
		index('listings_status_idx').on(table.status),
		index('listings_published_idx').on(table.publishedAt),
		// Используется для дедупа по contentHash внутри города при парсинге и cleanup
		index('listings_city_status_hash_idx').on(table.cityId, table.status, table.contentHash),
		// Используется для дедупа по контакту внутри города
		index('listings_city_contact_idx').on(table.cityId, table.contact),
		// Используется чекером актуальности: active + checkedAt ASC (сначала непроверенные)
		index('listings_status_checked_idx').on(table.status, table.checkedAt)
	]
);

export const listingReports = pgTable(
	'listing_reports',
	{
		id: serial('id').primaryKey(),
		listingId: integer('listing_id')
			.notNull()
			.references(() => listings.id, { onDelete: 'cascade' }),
		reason: text('reason').notNull(),
		details: text('details'),
		status: text('status').notNull().default('open'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('listing_reports_listing_idx').on(table.listingId), index('listing_reports_status_idx').on(table.status)]
);

export const bannedAuthors = pgTable(
	'banned_authors',
	{
		id: serial('id').primaryKey(),
		contact: text('contact').notNull().unique(),
		reason: text('reason'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('banned_authors_contact_idx').on(table.contact)]
);

export const listingsRelations = relations(listings, ({ one, many }) => ({
	city: one(cities, {
		fields: [listings.cityId],
		references: [cities.id]
	}),
	telegramGroup: one(telegramGroups, {
		fields: [listings.telegramGroupId],
		references: [telegramGroups.id]
	}),
	category: one(categories, {
		fields: [listings.categoryId],
		references: [categories.id]
	}),
	reports: many(listingReports)
}));

export const listingReportsRelations = relations(listingReports, ({ one }) => ({
	listing: one(listings, {
		fields: [listingReports.listingId],
		references: [listings.id]
	})
}));
