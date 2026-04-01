-- Курсор/старт как в админке (скрин). Выполнить на сервере:
--   cd /opt/tradehub && export $(grep -v '^#' .env | xargs) && psql "$DATABASE_URL" -f scripts/update-telegram-cursors.sql

UPDATE telegram_groups SET last_message_id = 472283, start_message_id = 472283 WHERE username = 'baraholka_tbilisi';
UPDATE telegram_groups SET last_message_id = 10285, start_message_id = 10285 WHERE username = 'baraholka_tbilis';
UPDATE telegram_groups SET last_message_id = 60049, start_message_id = 60049 WHERE username = 'baraholka_batumi_home_chanel';
UPDATE telegram_groups SET last_message_id = 1028376, start_message_id = 1028376 WHERE username = 'avito_baraholka_tbilisi';
UPDATE telegram_groups SET last_message_id = 10515, start_message_id = 10515 WHERE username = 'tbilisi_market';
UPDATE telegram_groups SET last_message_id = 105903, start_message_id = 105903 WHERE username = 'baraholka_batum';
UPDATE telegram_groups SET last_message_id = 103, start_message_id = 103 WHERE username = 'TbilisiTradeHub';
UPDATE telegram_groups SET last_message_id = 1, start_message_id = 0 WHERE username = 'baraholka_batumi_home';
UPDATE telegram_groups SET last_message_id = 1, start_message_id = 0 WHERE username = 'baraholka_ge';
UPDATE telegram_groups SET last_message_id = 19496, start_message_id = 19496 WHERE username = 'baraholka_avito_batumi';
UPDATE telegram_groups SET last_message_id = 2299485, start_message_id = 2299485 WHERE username = 'Batumi_helps';
UPDATE telegram_groups SET last_message_id = 7777, start_message_id = 7777 WHERE username = 'BatumiTradeHub';
UPDATE telegram_groups SET last_message_id = 32, start_message_id = 32 WHERE username = 'tbilisi_baraholka';
UPDATE telegram_groups SET last_message_id = 100, start_message_id = 100 WHERE username = 'tbilisi_buy_sell';
UPDATE telegram_groups SET last_message_id = 1, start_message_id = 0 WHERE username = 'batumi_baraholka';
