# Chat Analyzer

Next.js 14 + TypeScript + Tailwind + Supabase + YooKassa + Resend.

## Локальный запуск

1) `npm ci`
2) Скопируйте `.env.example` → `.env.local` и заполните переменные
3) `npm run dev`

## Supabase (обязательно)

1) Создайте проект Supabase
2) В SQL Editor выполните миграцию: `supabase/migrations/20240311_create_tables.sql`
   - Создаст таблицы, RLS, триггер автосоздания `public.users`
   - Создаст bucket `chat-files` и политики доступа по папке `${auth.uid()}/...`
3) В Auth включите Email (при необходимости настройте redirect URLs под домен Vercel)

## YooKassa (платежи)

Используется flow: создание платежа → редирект → webhook подтверждает оплату (проверка делается через API YooKassa).

Переменные окружения:
- `YOOKASSA_SHOP_ID`
- `YOOKASSA_SECRET_KEY`
- `YOOKASSA_API_BASE_URL` (опционально, по умолчанию `https://api.yookassa.ru/v3`)
- `YOOKASSA_WEBHOOK_TOKEN` (опционально; если задан — webhook ждёт заголовок `x-yookassa-webhook-token`)

Webhook URL для YooKassa:
- `https://<your-vercel-domain>/api/payment/webhook`

## Деплой (Vercel)

1) Подключите репозиторий к Vercel
2) Добавьте env vars из `.env.example` (плюс Supabase/Resend/YooKassa секреты)
3) Деплойте `main`

## Скрипты

- Tests: `npm test -- --runInBand`
- Lint: `npm run lint`
- Build: `npm run build`

